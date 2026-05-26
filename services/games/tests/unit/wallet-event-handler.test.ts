import { beforeEach, describe, expect, test } from "bun:test";
import {
  WALLET_ROUTING_KEYS,
  asBetId,
  asCorrelationId,
  asEventId,
  asPlayerId,
  asRoundId,
  makeCents,
  type BetId,
  type EventId,
  type RoundId,
  type WalletBetDebitRejected,
  type WalletBetDebited,
} from "@crash/contracts";
import {
  AcceptBetDebitUseCase,
  HandleWalletEventUseCase,
  OpenRoundUseCase,
  PlaceBetUseCase,
  RealtimeEventFactory,
  RejectBetDebitUseCase,
  type Clock,
  type IdGenerator,
  type SeedGenerator,
} from "../../src/application";
import { ProvablyFairService } from "../../src/domain";
import {
  InMemoryProcessedWalletEventStore,
  InMemoryRealtimeEventBus,
  InMemoryRoundRepository,
} from "../../src/infrastructure";

const roundId = asRoundId("11111111-1111-4111-8111-111111111111");
const betId = asBetId("22222222-2222-4222-8222-222222222222");
const playerId = asPlayerId("player-1");

class FixedClock implements Clock {
  now(): Date {
    return new Date("2026-05-26T00:00:00.000Z");
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

class FixedSeedGenerator implements SeedGenerator {
  nextServerSeed(): string {
    return "server-seed-1";
  }
}

describe("HandleWalletEventUseCase", () => {
  let repository: InMemoryRoundRepository;
  let realtimeEventBus: InMemoryRealtimeEventBus;
  let handler: HandleWalletEventUseCase;

  beforeEach(async () => {
    repository = new InMemoryRoundRepository();
    realtimeEventBus = new InMemoryRealtimeEventBus();
    const clock = new FixedClock();
    const provablyFairService = new ProvablyFairService();
    await new OpenRoundUseCase(
      repository,
      new FixedIdGenerator(),
      new FixedSeedGenerator(),
      clock,
      provablyFairService,
    ).execute({
      bettingWindowMs: 10000,
      clientSeed: "client-seed",
      growthBpsPerSecond: 5000,
    });
    await new PlaceBetUseCase(repository, new FixedIdGenerator(), clock).execute({
      playerId,
      username: "player",
      amountCents: makeCents(1000),
    });

    handler = new HandleWalletEventUseCase(
      new AcceptBetDebitUseCase(repository),
      new RejectBetDebitUseCase(repository, clock),
      new InMemoryProcessedWalletEventStore(),
      realtimeEventBus,
      new RealtimeEventFactory(),
    );
  });

  test("accepts a bet when Wallet confirms debit", async () => {
    const result = await handler.execute(walletDebitedEvent());

    expect(result).toMatchObject({ handled: true, duplicate: false });
    expect(result.bet?.status).toBe("accepted");
    expect(realtimeEventBus.events[0]).toMatchObject({
      type: "bet:accepted",
      payload: { betId, status: "accepted" },
    });
  });

  test("rejects a bet when Wallet rejects debit", async () => {
    const result = await handler.execute(walletRejectedEvent());

    expect(result.bet).toMatchObject({
      betId,
      status: "rejected",
      rejectionReason: "INSUFFICIENT_BALANCE",
    });
    expect(realtimeEventBus.events[0].type).toBe("bet:rejected");
  });

  test("deduplicates repeated Wallet events by event id", async () => {
    const event = walletDebitedEvent();

    await handler.execute(event);
    const duplicate = await handler.execute(event);

    expect(duplicate).toEqual({ handled: false, duplicate: true });
    expect(realtimeEventBus.events).toHaveLength(1);
  });
});

function walletDebitedEvent(eventId = eventIdFor("33333333-3333-4333-8333-333333333333")): WalletBetDebited {
  return {
    eventId,
    correlationId: asCorrelationId("correlation-1"),
    type: WALLET_ROUTING_KEYS.betDebited,
    version: 1,
    occurredAt: "2026-05-26T00:00:00.000Z",
    payload: { playerId, roundId, betId, amountCents: makeCents(1000) },
  };
}

function walletRejectedEvent(): WalletBetDebitRejected {
  return {
    eventId: eventIdFor("44444444-4444-4444-8444-444444444444"),
    correlationId: asCorrelationId("correlation-1"),
    type: WALLET_ROUTING_KEYS.betDebitRejected,
    version: 1,
    occurredAt: "2026-05-26T00:00:00.000Z",
    payload: {
      playerId,
      roundId,
      betId,
      amountCents: makeCents(1000),
      reason: "INSUFFICIENT_BALANCE",
    },
  };
}

function eventIdFor(value: string): EventId {
  return asEventId(value);
}
