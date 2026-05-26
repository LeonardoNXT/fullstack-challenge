import { describe, expect, test } from "bun:test";
import { asOperationId, asPlayerId, makeCents } from "@crash/contracts";
import { Wallet, WalletDomainError } from "../../src/domain";

describe("Wallet domain", () => {
  test("creates a wallet with an integer cents balance", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(100000));

    expect(wallet.playerId).toBe("player-1");
    expect(wallet.balanceCents).toBe(100000);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  test("rejects negative initial balance", () => {
    expect(() => Wallet.create(asPlayerId("player-1"), makeCents(-1))).toThrow(
      new WalletDomainError("INVALID_INITIAL_BALANCE"),
    );
  });

  test("credits balance and appends a ledger entry", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));
    const occurredAt = new Date("2026-05-25T00:00:00.000Z");

    const result = wallet.credit(
      asOperationId("cashout-1"),
      makeCents(250),
      "cashout",
      occurredAt,
    );

    expect(result.applied).toBe(true);
    expect(wallet.balanceCents).toBe(1250);
    expect(wallet.ledgerEntries).toEqual([
      {
        operationId: "cashout-1",
        type: "credit",
        amountCents: 250,
        balanceAfterCents: 1250,
        occurredAt,
        reason: "cashout",
      },
    ]);
  });

  test("debits balance and appends a ledger entry", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));
    const occurredAt = new Date("2026-05-25T00:00:00.000Z");

    const result = wallet.debit(
      asOperationId("bet-1"),
      makeCents(400),
      "bet",
      occurredAt,
    );

    expect(result.applied).toBe(true);
    expect(wallet.balanceCents).toBe(600);
    expect(wallet.ledgerEntries[0]).toEqual({
      operationId: "bet-1",
      type: "debit",
      amountCents: 400,
      balanceAfterCents: 600,
      occurredAt,
      reason: "bet",
    });
  });

  test("rejects debit when balance is insufficient", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(100));

    expect(() =>
      wallet.debit(asOperationId("bet-1"), makeCents(101), "bet"),
    ).toThrow(new WalletDomainError("INSUFFICIENT_BALANCE"));
    expect(wallet.balanceCents).toBe(100);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  test("does not apply duplicate credit operation twice", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));
    const operationId = asOperationId("cashout-1");

    const first = wallet.credit(operationId, makeCents(250), "cashout");
    const second = wallet.credit(operationId, makeCents(250), "cashout");

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(wallet.balanceCents).toBe(1250);
    expect(wallet.ledgerEntries).toHaveLength(1);
  });

  test("does not apply duplicate debit operation twice", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));
    const operationId = asOperationId("bet-1");

    const first = wallet.debit(operationId, makeCents(400), "bet");
    const second = wallet.debit(operationId, makeCents(400), "bet");

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(wallet.balanceCents).toBe(600);
    expect(wallet.ledgerEntries).toHaveLength(1);
  });

  test("rejects zero and negative ledger amounts", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));

    expect(() => wallet.credit(asOperationId("credit-0"), makeCents(0), "seed")).toThrow(
      new WalletDomainError("INVALID_LEDGER_AMOUNT"),
    );
    expect(() => wallet.debit(asOperationId("debit-0"), makeCents(-1), "bet")).toThrow(
      new WalletDomainError("INVALID_LEDGER_AMOUNT"),
    );
  });

  test("rehydrates from a snapshot without exposing mutable ledger state", () => {
    const wallet = Wallet.create(asPlayerId("player-1"), makeCents(1000));
    wallet.debit(asOperationId("bet-1"), makeCents(200), "bet");

    const rehydrated = Wallet.rehydrate(wallet.toSnapshot());
    const copiedLedger = rehydrated.ledgerEntries as unknown as unknown[];
    copiedLedger.push({ operationId: "external-mutation" });

    expect(rehydrated.balanceCents).toBe(800);
    expect(rehydrated.ledgerEntries).toHaveLength(1);
  });
});
