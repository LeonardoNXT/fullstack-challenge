import { beforeEach, describe, expect, test } from "bun:test";
import {
  asBetId,
  asPlayerId,
  asRoundId,
  makeCents,
  makeMultiplierBps,
  type BetId,
  type RoundId,
} from "@crash/contracts";
import {
  AcceptBetDebitUseCase,
  CashOutUseCase,
  CrashRoundUseCase,
  GameApplicationError,
  GetCurrentRoundUseCase,
  GetLeaderboardUseCase,
  GetPlayerBetsUseCase,
  GetRoundHistoryUseCase,
  OpenRoundUseCase,
  PlaceBetUseCase,
  RejectBetDebitUseCase,
  StartRoundUseCase,
  VerifyRoundUseCase,
  type Clock,
  type IdGenerator,
  type SeedGenerator,
} from "../../src/application";
import { GameDomainError, ProvablyFairService } from "../../src/domain";
import { InMemoryRoundRepository } from "../../src/infrastructure";

const roundId = asRoundId("11111111-1111-4111-8111-111111111111");
const firstBetId = asBetId("22222222-2222-4222-8222-222222222222");
const secondBetId = asBetId("33333333-3333-4333-8333-333333333333");

class MutableClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  setNow(next: Date): void {
    this.current = next;
  }
}

class DeterministicIdGenerator implements IdGenerator {
  private betIndex = 0;
  private readonly betIds = [firstBetId, secondBetId];

  nextRoundId(): RoundId {
    return roundId;
  }

  nextBetId(): BetId {
    const betId = this.betIds[this.betIndex];
    this.betIndex += 1;
    return betId;
  }
}

class FixedSeedGenerator implements SeedGenerator {
  nextServerSeed(): string {
    return "server-seed-1";
  }
}

describe("Games application use cases", () => {
  let repository: InMemoryRoundRepository;
  let clock: MutableClock;
  let idGenerator: DeterministicIdGenerator;
  let seedGenerator: FixedSeedGenerator;
  let provablyFairService: ProvablyFairService;

  beforeEach(() => {
    repository = new InMemoryRoundRepository();
    clock = new MutableClock(new Date("2026-05-26T00:00:00.000Z"));
    idGenerator = new DeterministicIdGenerator();
    seedGenerator = new FixedSeedGenerator();
    provablyFairService = new ProvablyFairService();
  });

  test("opens and retrieves the current betting round", async () => {
    const openRound = new OpenRoundUseCase(
      repository,
      idGenerator,
      seedGenerator,
      clock,
      provablyFairService,
    );
    const getCurrentRound = new GetCurrentRoundUseCase(repository, clock);

    const opened = await openRound.execute({
      bettingWindowMs: 10000,
      clientSeed: "client-seed",
      growthBpsPerSecond: 5000,
    });
    const current = await getCurrentRound.execute();

    expect(opened.roundId).toBe(roundId);
    expect(opened.phase).toBe("betting");
    expect(opened.serverSeedHash).toBe(
      provablyFairService.hashServerSeed("server-seed-1"),
    );
    expect(current.roundId).toBe(roundId);
  });

  test("places a pending bet on the current round", async () => {
    await openDefaultRound();
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);

    const bet = await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
      autoCashoutMultiplierBps: makeMultiplierBps(15000),
    });

    expect(bet).toMatchObject({
      betId: firstBetId,
      roundId,
      playerId: "player-1",
      amountCents: 1000,
      status: "pending",
    });
  });

  test("accepts and rejects wallet debit outcomes", async () => {
    await openDefaultRound();
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player 1",
      amountCents: makeCents(1000),
    });
    await placeBet.execute({
      playerId: asPlayerId("player-2"),
      username: "player 2",
      amountCents: makeCents(1000),
    });

    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: firstBetId });
    await new RejectBetDebitUseCase(repository, clock).execute({
      roundId,
      betId: secondBetId,
      reason: "INSUFFICIENT_BALANCE",
    });

    const current = await new GetCurrentRoundUseCase(repository, clock).execute();
    expect(current.bets.map((bet) => bet.status)).toEqual(["accepted", "rejected"]);
  });

  test("starts a round and cashes out an accepted bet", async () => {
    await openDefaultRound({ crashPointBps: makeMultiplierBps(30000) });
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: firstBetId });

    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await new StartRoundUseCase(repository, clock).execute();
    clock.setNow(new Date("2026-05-26T00:00:11.000Z"));
    const result = await new CashOutUseCase(repository, clock).execute(
      asPlayerId("player-1"),
    );

    expect(result.payoutCents).toBe(1500);
    expect(result.multiplierBps).toBe(15000);
    expect(result.round.bets[0].status).toBe("cashed_out");
  });

  test("crashes a running round and reveals crash point in public view", async () => {
    await openDefaultRound({ crashPointBps: makeMultiplierBps(20000) });
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: firstBetId });

    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await new StartRoundUseCase(repository, clock).execute();
    clock.setNow(new Date("2026-05-26T00:00:12.000Z"));
    const crashed = await new CrashRoundUseCase(repository, clock).execute();

    expect(crashed.phase).toBe("crashed");
    expect(crashed.crashPointBps).toBe(20000);
    expect(crashed.bets[0].status).toBe("lost");
  });

  test("verifies a round provably fair payload", async () => {
    await openDefaultRound();

    const verification = await new VerifyRoundUseCase(
      repository,
      provablyFairService,
    ).execute(roundId);

    expect(verification.serverSeed).toBe("server-seed-1");
    expect(verification.validSeedHash).toBe(true);
  });

  test("returns player bets and settled round history", async () => {
    await openDefaultRound({ crashPointBps: makeMultiplierBps(20000) });
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: firstBetId });
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await new StartRoundUseCase(repository, clock).execute();
    clock.setNow(new Date("2026-05-26T00:00:12.000Z"));
    await new CrashRoundUseCase(repository, clock).execute();
    const round = await repository.findById(roundId);
    if (round === null) {
      throw new Error("Expected round");
    }
    round.settle();
    await repository.save(round);

    const bets = await new GetPlayerBetsUseCase(repository).execute(
      asPlayerId("player-1"),
    );
    const history = await new GetRoundHistoryUseCase(repository, clock).execute();

    expect(bets).toHaveLength(1);
    expect(bets[0].status).toBe("lost");
    expect(history).toHaveLength(1);
    expect(history[0].phase).toBe("settled");
  });

  test("computes leaderboard profit from settled bets", async () => {
    await openDefaultRound({ crashPointBps: makeMultiplierBps(30000) });
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "winner",
      amountCents: makeCents(1000),
    });
    await placeBet.execute({
      playerId: asPlayerId("player-2"),
      username: "loser",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: firstBetId });
    await new AcceptBetDebitUseCase(repository).execute({ roundId, betId: secondBetId });
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await new StartRoundUseCase(repository, clock).execute();
    clock.setNow(new Date("2026-05-26T00:00:11.000Z"));
    await new CashOutUseCase(repository, clock).execute(asPlayerId("player-1"));
    clock.setNow(new Date("2026-05-26T00:00:12.000Z"));
    await new CrashRoundUseCase(repository, clock).execute();

    const leaderboard = await new GetLeaderboardUseCase(repository).execute();

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0]).toMatchObject({
      username: "winner",
      profitCents: 500,
      wageredCents: 1000,
      payoutCents: 1500,
    });
    expect(leaderboard[1]).toMatchObject({
      username: "loser",
      profitCents: -1000,
      wageredCents: 1000,
      payoutCents: 0,
    });
  });

  test("throws when current round is missing", async () => {
    await expect(new GetCurrentRoundUseCase(repository, clock).execute()).rejects.toThrow(
      new GameApplicationError("CURRENT_ROUND_NOT_FOUND"),
    );
  });

  test("surfaces domain errors from invalid player actions", async () => {
    await openDefaultRound();
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
    });

    await expect(
      placeBet.execute({
        playerId: asPlayerId("player-1"),
        username: "player",
        amountCents: makeCents(1000),
      }),
    ).rejects.toThrow(new GameDomainError("DUPLICATE_BET"));
  });

  async function openDefaultRound(input?: {
    readonly crashPointBps?: ReturnType<typeof makeMultiplierBps>;
  }): Promise<void> {
    const openRound = new OpenRoundUseCase(
      repository,
      idGenerator,
      seedGenerator,
      clock,
      {
        calculateCrashPoint: () => input?.crashPointBps ?? makeMultiplierBps(20000),
        hashServerSeed: (serverSeed: string) =>
          provablyFairService.hashServerSeed(serverSeed),
      } as ProvablyFairService,
    );

    await openRound.execute({
      bettingWindowMs: 10000,
      clientSeed: "client-seed",
      growthBpsPerSecond: 5000,
    });
  }
});
