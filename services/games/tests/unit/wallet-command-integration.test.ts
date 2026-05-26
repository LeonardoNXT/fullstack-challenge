import { describe, expect, test } from "bun:test";
import {
  WALLET_ROUTING_KEYS,
  asBetId,
  asCorrelationId,
  asEventId,
  asPlayerId,
  asRoundId,
  makeCents,
  makeMultiplierBps,
  type BetId,
  type CorrelationId,
  type EventId,
  type RoundId,
} from "@crash/contracts";
import {
  AcceptBetDebitUseCase,
  CashOutUseCase,
  OpenRoundUseCase,
  PlaceBetUseCase,
  WalletCommandFactory,
  type Clock,
  type IdGenerator,
  type MessageIdGenerator,
  type SeedGenerator,
} from "../../src/application";
import { ProvablyFairService } from "../../src/domain";
import {
  InMemoryRoundRepository,
  InMemoryWalletCommandPublisher,
} from "../../src/infrastructure";

const roundId = asRoundId("11111111-1111-4111-8111-111111111111");
const betId = asBetId("22222222-2222-4222-8222-222222222222");

class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  setNow(next: Date): void {
    this.current = next;
  }
}

class FixedIdGenerator implements IdGenerator {
  nextRoundId(): RoundId {
    return roundId;
  }

  nextBetId(): BetId {
    return betId;
  }
}

class FixedMessageIdGenerator implements MessageIdGenerator {
  nextEventId(): EventId {
    return asEventId("33333333-3333-4333-8333-333333333333");
  }

  nextCorrelationId(): CorrelationId {
    return asCorrelationId("bet-correlation-1");
  }
}

class FixedSeedGenerator implements SeedGenerator {
  nextServerSeed(): string {
    return "server-seed-1";
  }
}

describe("Games wallet command integration", () => {
  test("publishes a wallet debit command after placing a bet", async () => {
    const { repository, clock, publisher, walletCommandFactory, messageIdGenerator } =
      await setupRound();
    const placeBet = new PlaceBetUseCase(
      repository,
      new FixedIdGenerator(),
      clock,
      publisher,
      walletCommandFactory,
      messageIdGenerator,
    );

    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });

    expect(publisher.publishedCommands).toHaveLength(1);
    expect(publisher.publishedCommands[0]).toMatchObject({
      type: WALLET_ROUTING_KEYS.betDebitRequested,
      correlationId: "bet-correlation-1",
      payload: {
        playerId: "player-1",
        roundId,
        betId,
        amountCents: 1000,
      },
    });
  });

  test("publishes a wallet credit command after cashout", async () => {
    const { repository, clock, publisher, walletCommandFactory, messageIdGenerator } =
      await setupRound({ crashPointBps: makeMultiplierBps(30000) });
    const idGenerator = new FixedIdGenerator();
    const placeBet = new PlaceBetUseCase(
      repository,
      idGenerator,
      clock,
      publisher,
      walletCommandFactory,
      messageIdGenerator,
    );

    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId });
    const round = await repository.findById(roundId);
    if (round === null) {
      throw new Error("Expected round");
    }
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    round.start(clock.now());
    await repository.save(round);

    clock.setNow(new Date("2026-05-26T00:00:11.000Z"));
    await new CashOutUseCase(
      repository,
      clock,
      publisher,
      walletCommandFactory,
      messageIdGenerator,
    ).execute(asPlayerId("player-1"));

    expect(publisher.publishedCommands[1]).toMatchObject({
      type: WALLET_ROUTING_KEYS.cashoutCreditRequested,
      payload: {
        playerId: "player-1",
        roundId,
        betId,
        amountCents: 1000,
        payoutCents: 1500,
        multiplierBps: 15000,
      },
    });
  });

  async function setupRound(input?: {
    readonly crashPointBps?: ReturnType<typeof makeMultiplierBps>;
  }): Promise<{
    readonly repository: InMemoryRoundRepository;
    readonly clock: FixedClock;
    readonly publisher: InMemoryWalletCommandPublisher;
    readonly walletCommandFactory: WalletCommandFactory;
    readonly messageIdGenerator: FixedMessageIdGenerator;
  }> {
    const repository = new InMemoryRoundRepository();
    const clock = new FixedClock(new Date("2026-05-26T00:00:00.000Z"));
    const provablyFairService = new ProvablyFairService();
    await new OpenRoundUseCase(
      repository,
      new FixedIdGenerator(),
      new FixedSeedGenerator(),
      clock,
      {
        calculateCrashPoint: () => input?.crashPointBps ?? makeMultiplierBps(20000),
        hashServerSeed: (serverSeed: string) =>
          provablyFairService.hashServerSeed(serverSeed),
      } as ProvablyFairService,
    ).execute({
      bettingWindowMs: 10000,
      clientSeed: "client-seed",
      growthBpsPerSecond: 5000,
    });

    return {
      repository,
      clock,
      publisher: new InMemoryWalletCommandPublisher(),
      walletCommandFactory: new WalletCommandFactory(),
      messageIdGenerator: new FixedMessageIdGenerator(),
    };
  }
});
