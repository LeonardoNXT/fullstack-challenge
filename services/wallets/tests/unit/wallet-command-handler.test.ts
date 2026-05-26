import { beforeEach, describe, expect, test } from "bun:test";
import {
  WALLET_ROUTING_KEYS,
  asBetId,
  asCorrelationId,
  asEventId,
  asPlayerId,
  asRoundId,
  makeCents,
  type EventId,
  type WalletBetDebitRequested,
  type WalletCashoutCreditRequested,
} from "@crash/contracts";
import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  HandleWalletCommandUseCase,
  WalletEventFactory,
  type MessageIdGenerator,
} from "../../src/application";
import {
  InMemoryWalletEventPublisher,
  InMemoryWalletRepository,
} from "../../src/infrastructure";

const playerId = asPlayerId("player-1");
const roundId = asRoundId("11111111-1111-4111-8111-111111111111");
const betId = asBetId("22222222-2222-4222-8222-222222222222");

class FixedMessageIdGenerator implements MessageIdGenerator {
  nextEventId(): EventId {
    return asEventId("33333333-3333-4333-8333-333333333333");
  }
}

describe("HandleWalletCommandUseCase", () => {
  let repository: InMemoryWalletRepository;
  let createWallet: CreateWalletUseCase;
  let handler: HandleWalletCommandUseCase;
  let publisher: InMemoryWalletEventPublisher;

  beforeEach(() => {
    repository = new InMemoryWalletRepository();
    createWallet = new CreateWalletUseCase(repository);
    publisher = new InMemoryWalletEventPublisher();
    handler = new HandleWalletCommandUseCase(
      new DebitWalletUseCase(repository),
      new CreditWalletUseCase(repository),
      new WalletEventFactory(),
      new FixedMessageIdGenerator(),
      publisher,
    );
  });

  test("debits a bet command and publishes a debited event", async () => {
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    const event = await handler.execute(betDebitCommand(makeCents(400)));

    const wallet = await repository.findByPlayerId(playerId);
    expect(wallet?.balanceCents).toBe(600);
    expect(event.type).toBe(WALLET_ROUTING_KEYS.betDebited);
    expect(publisher.publishedEvents).toHaveLength(1);
  });

  test("deduplicates repeated bet debit commands through the ledger", async () => {
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    await handler.execute(betDebitCommand(makeCents(400)));
    await handler.execute(betDebitCommand(makeCents(400)));

    const wallet = await repository.findByPlayerId(playerId);
    expect(wallet?.balanceCents).toBe(600);
    expect(wallet?.ledgerEntries).toHaveLength(1);
  });

  test("rejects a bet debit command when balance is insufficient", async () => {
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(100) });

    const event = await handler.execute(betDebitCommand(makeCents(400)));

    const wallet = await repository.findByPlayerId(playerId);
    expect(wallet?.balanceCents).toBe(100);
    expect(event).toMatchObject({
      type: WALLET_ROUTING_KEYS.betDebitRejected,
      payload: { reason: "INSUFFICIENT_BALANCE" },
    });
  });

  test("credits a cashout command idempotently", async () => {
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    await handler.execute(cashoutCreditCommand(makeCents(1500)));
    const event = await handler.execute(cashoutCreditCommand(makeCents(1500)));

    const wallet = await repository.findByPlayerId(playerId);
    expect(wallet?.balanceCents).toBe(2500);
    expect(wallet?.ledgerEntries).toHaveLength(1);
    expect(event.type).toBe(WALLET_ROUTING_KEYS.cashoutCredited);
  });
});

function betDebitCommand(amountCents: ReturnType<typeof makeCents>): WalletBetDebitRequested {
  return {
    eventId: asEventId("44444444-4444-4444-8444-444444444444"),
    correlationId: asCorrelationId("correlation-1"),
    type: WALLET_ROUTING_KEYS.betDebitRequested,
    version: 1,
    occurredAt: "2026-05-26T00:00:00.000Z",
    payload: { playerId, roundId, betId, amountCents },
  };
}

function cashoutCreditCommand(
  payoutCents: ReturnType<typeof makeCents>,
): WalletCashoutCreditRequested {
  return {
    eventId: asEventId("55555555-5555-4555-8555-555555555555"),
    correlationId: asCorrelationId("correlation-2"),
    type: WALLET_ROUTING_KEYS.cashoutCreditRequested,
    version: 1,
    occurredAt: "2026-05-26T00:00:01.000Z",
    payload: {
      playerId,
      roundId,
      betId,
      amountCents: makeCents(1000),
      payoutCents,
      multiplierBps: 15000,
    },
  };
}
