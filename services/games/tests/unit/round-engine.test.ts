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
  OpenRoundUseCase,
  PlaceBetUseCase,
  TickRoundEngineUseCase,
  type Clock,
  type IdGenerator,
  type SeedGenerator,
} from "../../src/application";
import { ProvablyFairService } from "../../src/domain";
import { InMemoryRoundRepository } from "../../src/infrastructure";

class MutableClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  setNow(next: Date): void {
    this.current = next;
  }
}

class SequenceIdGenerator implements IdGenerator {
  private roundIndex = 0;
  private betIndex = 0;
  private readonly roundIds = [
    asRoundId("11111111-1111-4111-8111-111111111111"),
    asRoundId("22222222-2222-4222-8222-222222222222"),
  ];
  private readonly betIds = [asBetId("33333333-3333-4333-8333-333333333333")];

  nextRoundId(): RoundId {
    const roundId = this.roundIds[this.roundIndex];
    this.roundIndex += 1;
    return roundId;
  }

  nextBetId(): BetId {
    const betId = this.betIds[this.betIndex];
    this.betIndex += 1;
    return betId;
  }
}

class SequenceSeedGenerator implements SeedGenerator {
  private index = 0;
  private readonly seeds = ["server-seed-1", "server-seed-2"];

  nextServerSeed(): string {
    const seed = this.seeds[this.index];
    this.index += 1;
    return seed;
  }
}

describe("TickRoundEngineUseCase", () => {
  let repository: InMemoryRoundRepository;
  let clock: MutableClock;
  let idGenerator: SequenceIdGenerator;
  let seedGenerator: SequenceSeedGenerator;
  let provablyFairService: ProvablyFairService;
  let openRound: OpenRoundUseCase;
  let tickEngine: TickRoundEngineUseCase;

  beforeEach(() => {
    repository = new InMemoryRoundRepository();
    clock = new MutableClock(new Date("2026-05-26T00:00:00.000Z"));
    idGenerator = new SequenceIdGenerator();
    seedGenerator = new SequenceSeedGenerator();
    provablyFairService = new ProvablyFairService();
    openRound = new OpenRoundUseCase(
      repository,
      idGenerator,
      seedGenerator,
      clock,
      {
        calculateCrashPoint: () => makeMultiplierBps(20000),
        hashServerSeed: (serverSeed: string) =>
          provablyFairService.hashServerSeed(serverSeed),
      } as ProvablyFairService,
    );
    tickEngine = new TickRoundEngineUseCase(repository, clock, openRound);
  });

  test("opens a round when no current round exists", async () => {
    const result = await tickEngine.execute(engineInput());

    expect(result.actions).toEqual(["opened"]);
    expect(result.round?.phase).toBe("betting");
    expect(result.round?.roundId).toBe("11111111-1111-4111-8111-111111111111");
  });

  test("starts betting round when betting window closes", async () => {
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));

    const result = await tickEngine.execute(engineInput());

    expect(result.actions).toEqual(["started"]);
    expect(result.round?.phase).toBe("running");
  });

  test("applies auto cashout during running phase", async () => {
    await tickEngine.execute(engineInput());
    const placeBet = new PlaceBetUseCase(repository, idGenerator, clock);
    const bet = await placeBet.execute({
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
      autoCashoutMultiplierBps: makeMultiplierBps(15000),
    });
    await new AcceptBetDebitUseCase(repository).execute({
      roundId: bet.roundId,
      betId: bet.betId,
    });
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:11.000Z"));

    const result = await tickEngine.execute(engineInput());

    expect(result.actions).toEqual(["auto_cashed_out"]);
    expect(result.autoCashedOutBets).toHaveLength(1);
    expect(result.autoCashedOutBets[0].status).toBe("cashed_out");
  });

  test("crashes running round at crash point", async () => {
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:12.000Z"));

    const result = await tickEngine.execute(engineInput());

    expect(result.actions).toEqual(["crashed"]);
    expect(result.round?.phase).toBe("crashed");
    expect(result.round?.crashPointBps).toBe(20000);
  });

  test("settles crashed round and opens next round after delay", async () => {
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:10.000Z"));
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:12.000Z"));
    await tickEngine.execute(engineInput());
    clock.setNow(new Date("2026-05-26T00:00:15.000Z"));

    const result = await tickEngine.execute(engineInput());
    const history = await repository.findRecentSettled(10);

    expect(result.actions).toEqual(["settled", "opened"]);
    expect(history).toHaveLength(1);
    expect(result.round?.phase).toBe("betting");
    expect(result.round?.roundId).toBe("22222222-2222-4222-8222-222222222222");
  });
});

function engineInput() {
  return {
    bettingWindowMs: 10000,
    settlementDelayMs: 3000,
    clientSeed: "client-seed",
    houseEdgeBps: 100,
    growthBpsPerSecond: 5000,
  };
}
