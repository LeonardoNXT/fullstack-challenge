import { beforeEach, describe, expect, test } from "bun:test";
import { asOperationId, asPlayerId, makeCents } from "@crash/contracts";
import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase,
  WalletApplicationError,
} from "../../src/application";
import { WalletDomainError } from "../../src/domain";
import { InMemoryWalletRepository } from "../../src/infrastructure";

describe("Wallet application use cases", () => {
  let repository: InMemoryWalletRepository;
  let createWallet: CreateWalletUseCase;
  let getWallet: GetWalletUseCase;
  let creditWallet: CreditWalletUseCase;
  let debitWallet: DebitWalletUseCase;

  beforeEach(() => {
    repository = new InMemoryWalletRepository();
    createWallet = new CreateWalletUseCase(repository);
    getWallet = new GetWalletUseCase(repository);
    creditWallet = new CreditWalletUseCase(repository);
    debitWallet = new DebitWalletUseCase(repository);
  });

  test("creates a wallet idempotently for one player", async () => {
    const playerId = asPlayerId("player-1");

    const first = await createWallet.execute({
      playerId,
      initialBalanceCents: makeCents(100000),
    });
    const second = await createWallet.execute({
      playerId,
      initialBalanceCents: makeCents(500),
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.wallet.balanceCents).toBe(100000);
  });

  test("gets an existing wallet snapshot", async () => {
    const playerId = asPlayerId("player-1");
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(750) });

    const wallet = await getWallet.execute({ playerId });

    expect(wallet.playerId).toBe("player-1");
    expect(wallet.balanceCents).toBe(750);
  });

  test("throws when getting a missing wallet", async () => {
    await expect(getWallet.execute({ playerId: asPlayerId("missing") })).rejects.toThrow(
      new WalletApplicationError("WALLET_NOT_FOUND"),
    );
  });

  test("credits an existing wallet and persists the result", async () => {
    const playerId = asPlayerId("player-1");
    const occurredAt = new Date("2026-05-25T00:00:00.000Z");
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    const result = await creditWallet.execute({
      playerId,
      operationId: asOperationId("cashout-1"),
      amountCents: makeCents(250),
      reason: "cashout",
      occurredAt,
    });
    const wallet = await getWallet.execute({ playerId });

    expect(result.applied).toBe(true);
    expect(result.balanceCents).toBe(1250);
    expect(result.ledgerEntry).toEqual({
      operationId: "cashout-1",
      type: "credit",
      amountCents: 250,
      balanceAfterCents: 1250,
      occurredAt,
      reason: "cashout",
    });
    expect(wallet.balanceCents).toBe(1250);
  });

  test("debits an existing wallet and persists the result", async () => {
    const playerId = asPlayerId("player-1");
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    const result = await debitWallet.execute({
      playerId,
      operationId: asOperationId("bet-1"),
      amountCents: makeCents(400),
      reason: "bet",
    });
    const wallet = await getWallet.execute({ playerId });

    expect(result.applied).toBe(true);
    expect(result.balanceCents).toBe(600);
    expect(wallet.balanceCents).toBe(600);
    expect(wallet.ledgerEntries).toHaveLength(1);
  });

  test("deduplicates repeated debit operations through the domain ledger", async () => {
    const playerId = asPlayerId("player-1");
    const operationId = asOperationId("bet-1");
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(1000) });

    const first = await debitWallet.execute({
      playerId,
      operationId,
      amountCents: makeCents(400),
      reason: "bet",
    });
    const second = await debitWallet.execute({
      playerId,
      operationId,
      amountCents: makeCents(400),
      reason: "bet",
    });

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.balanceCents).toBe(600);
  });

  test("does not persist failed insufficient-balance debit side effects", async () => {
    const playerId = asPlayerId("player-1");
    await createWallet.execute({ playerId, initialBalanceCents: makeCents(100) });

    await expect(
      debitWallet.execute({
        playerId,
        operationId: asOperationId("bet-1"),
        amountCents: makeCents(101),
        reason: "bet",
      }),
    ).rejects.toThrow(new WalletDomainError("INSUFFICIENT_BALANCE"));

    const wallet = await getWallet.execute({ playerId });
    expect(wallet.balanceCents).toBe(100);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  test("throws when mutating a missing wallet", async () => {
    await expect(
      creditWallet.execute({
        playerId: asPlayerId("missing"),
        operationId: asOperationId("cashout-1"),
        amountCents: makeCents(100),
        reason: "cashout",
      }),
    ).rejects.toThrow(new WalletApplicationError("WALLET_NOT_FOUND"));
  });
});
