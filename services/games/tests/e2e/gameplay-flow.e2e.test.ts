import { describe, expect, test } from "bun:test";
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
  OpenRoundUseCase,
  PlaceBetUseCase,
  StartRoundUseCase,
  type Clock,
  type IdGenerator,
  type SeedGenerator,
} from "../../src/application";
import { ProvablyFairService } from "../../src/domain";
import { InMemoryRoundRepository } from "../../src/infrastructure";

const roundId = asRoundId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const betId = asBetId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

class MutableClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(next: string): void {
    this.current = new Date(next);
  }
}

class FixedIds implements IdGenerator {
  nextRoundId(): RoundId {
    return roundId;
  }

  nextBetId(): BetId {
    return betId;
  }
}

class FixedSeed implements SeedGenerator {
  nextServerSeed(): string {
    return "e2e-server-seed";
  }
}

describe("Gameplay e2e flow", () => {
  test("places a bet, accepts debit, starts and cashes out", async () => {
    const repository = new InMemoryRoundRepository();
    const clock = new MutableClock(new Date("2026-05-26T00:00:00.000Z"));
    await openRound(repository, clock, makeMultiplierBps(30000));

    const bet = await new PlaceBetUseCase(repository, new FixedIds(), clock).execute({
      playerId: asPlayerId("player-e2e"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({
      roundId: bet.roundId,
      betId: bet.betId,
    });

    clock.set("2026-05-26T00:00:10.000Z");
    await new StartRoundUseCase(repository, clock).execute();
    clock.set("2026-05-26T00:00:11.000Z");
    const cashout = await new CashOutUseCase(repository, clock).execute(
      asPlayerId("player-e2e"),
    );

    expect(cashout.payoutCents).toBe(1500);
    expect(cashout.bet.status).toBe("cashed_out");
  });

  test("marks accepted uncashed bets as lost on crash", async () => {
    const repository = new InMemoryRoundRepository();
    const clock = new MutableClock(new Date("2026-05-26T00:00:00.000Z"));
    await openRound(repository, clock, makeMultiplierBps(15000));

    const bet = await new PlaceBetUseCase(repository, new FixedIds(), clock).execute({
      playerId: asPlayerId("player-e2e"),
      username: "player",
      amountCents: makeCents(1000),
    });
    await new AcceptBetDebitUseCase(repository).execute({
      roundId: bet.roundId,
      betId: bet.betId,
    });

    clock.set("2026-05-26T00:00:10.000Z");
    await new StartRoundUseCase(repository, clock).execute();
    clock.set("2026-05-26T00:00:11.000Z");
    const crashed = await new CrashRoundUseCase(repository, clock).execute();

    expect(crashed.phase).toBe("crashed");
    expect(crashed.bets[0].status).toBe("lost");
  });
});

async function openRound(
  repository: InMemoryRoundRepository,
  clock: MutableClock,
  crashPointBps: ReturnType<typeof makeMultiplierBps>,
): Promise<void> {
  await new OpenRoundUseCase(
    repository,
    new FixedIds(),
    new FixedSeed(),
    clock,
    {
      hashServerSeed: (seed) => `hash:${seed}`,
      calculateCrashPoint: () => crashPointBps,
      verify: new ProvablyFairService().verify.bind(new ProvablyFairService()),
    },
  ).execute({
    bettingWindowMs: 10000,
    clientSeed: "e2e-client",
    growthBpsPerSecond: 5000,
  });
}
