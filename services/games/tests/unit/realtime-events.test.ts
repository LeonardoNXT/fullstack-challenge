import { describe, expect, test } from "bun:test";
import { asPlayerId, makeCents, makeMultiplierBps } from "@crash/contracts";
import { RealtimeEventFactory, type TickRoundEngineOutput } from "../../src/application";
import { InMemoryRealtimeEventBus } from "../../src/infrastructure";

describe("RealtimeEventFactory", () => {
  test("maps tick output into lifecycle and tick events", () => {
    const factory = new RealtimeEventFactory();
    const output: TickRoundEngineOutput = {
      actions: ["started"],
      round: {
        roundId: "11111111-1111-4111-8111-111111111111" as never,
        phase: "running",
        serverTime: "2026-05-26T00:00:10.000Z",
        bettingOpenedAt: "2026-05-26T00:00:00.000Z",
        bettingClosesAt: "2026-05-26T00:00:10.000Z",
        startedAt: "2026-05-26T00:00:10.000Z",
        currentMultiplierBps: makeMultiplierBps(10000),
        serverSeedHash: "hash",
        bets: [],
      },
      autoCashedOutBets: [],
    };

    const events = factory.fromTickResult(output);

    expect(events.map((event) => event.type)).toEqual(["round:started", "round:tick"]);
    expect(events[1]).toMatchObject({
      type: "round:tick",
      payload: {
        serverTime: "2026-05-26T00:00:10.000Z",
        multiplierBps: 10000,
      },
    });
  });

  test("emits auto cashout events before round tick", () => {
    const factory = new RealtimeEventFactory();
    const events = factory.fromTickResult({
      actions: ["auto_cashed_out"],
      round: {
        roundId: "11111111-1111-4111-8111-111111111111" as never,
        phase: "running",
        serverTime: "2026-05-26T00:00:11.000Z",
        bettingOpenedAt: "2026-05-26T00:00:00.000Z",
        bettingClosesAt: "2026-05-26T00:00:10.000Z",
        startedAt: "2026-05-26T00:00:10.000Z",
        currentMultiplierBps: makeMultiplierBps(15000),
        serverSeedHash: "hash",
        bets: [],
      },
      autoCashedOutBets: [
        {
          betId: "22222222-2222-4222-8222-222222222222" as never,
          roundId: "11111111-1111-4111-8111-111111111111" as never,
          playerId: asPlayerId("player-1"),
          username: "player",
          amountCents: makeCents(1000),
          status: "cashed_out",
          placedAt: new Date("2026-05-26T00:00:01.000Z"),
          payoutCents: makeCents(1500),
          cashoutMultiplierBps: makeMultiplierBps(15000),
        },
      ],
    });

    expect(events.map((event) => event.type)).toEqual(["bet:cashed-out", "round:tick"]);
  });
});

describe("InMemoryRealtimeEventBus", () => {
  test("records published events for tests", () => {
    const bus = new InMemoryRealtimeEventBus();

    bus.publish({
      type: "round:tick",
      payload: {
        roundId: "11111111-1111-4111-8111-111111111111" as never,
        serverTime: "2026-05-26T00:00:10.000Z",
        multiplierBps: makeMultiplierBps(10000),
      },
    });

    expect(bus.events).toHaveLength(1);
    expect(bus.events[0].type).toBe("round:tick");
  });
});
