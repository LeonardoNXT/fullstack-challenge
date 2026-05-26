import { describe, expect, test } from "bun:test";
import { asOperationId, asPlayerId, makeCents } from "@crash/contracts";
import {
  CreateWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase,
} from "../../src/application";
import { WalletDomainError } from "../../src/domain";
import { InMemoryWalletRepository } from "../../src/infrastructure";

describe("Wallet e2e flow", () => {
  test("creates, reads and debits a player wallet", async () => {
    const repository = new InMemoryWalletRepository();
    const playerId = asPlayerId("player-e2e");

    await new CreateWalletUseCase(repository).execute({
      playerId,
      initialBalanceCents: makeCents(100000),
    });
    await new DebitWalletUseCase(repository).execute({
      playerId,
      operationId: asOperationId("bet-e2e"),
      amountCents: makeCents(1500),
      reason: "bet:e2e-round",
    });

    const wallet = await new GetWalletUseCase(repository).execute({ playerId });
    expect(wallet.balanceCents).toBe(98500);
    expect(wallet.ledgerEntries).toHaveLength(1);
  });

  test("rejects insufficient balance without mutating the wallet", async () => {
    const repository = new InMemoryWalletRepository();
    const playerId = asPlayerId("player-e2e");

    await new CreateWalletUseCase(repository).execute({
      playerId,
      initialBalanceCents: makeCents(100),
    });

    await expect(
      new DebitWalletUseCase(repository).execute({
        playerId,
        operationId: asOperationId("too-large"),
        amountCents: makeCents(101),
        reason: "bet:e2e-round",
      }),
    ).rejects.toThrow(new WalletDomainError("INSUFFICIENT_BALANCE"));

    const wallet = await new GetWalletUseCase(repository).execute({ playerId });
    expect(wallet.balanceCents).toBe(100);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });
});
