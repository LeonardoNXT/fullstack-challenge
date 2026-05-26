import type { Cents, OperationId, PlayerId } from "@crash/contracts";
import type { LedgerEntry, WalletMutationResult } from "../../domain";
import { WalletApplicationError } from "../errors/wallet-application.error";
import type { WalletRepository } from "../ports/wallet.repository";

export interface DebitWalletInput {
  readonly playerId: PlayerId;
  readonly operationId: OperationId;
  readonly amountCents: Cents;
  readonly reason: string;
  readonly occurredAt?: Date;
}

export interface DebitWalletOutput {
  readonly applied: boolean;
  readonly balanceCents: Cents;
  readonly ledgerEntry?: LedgerEntry;
}

export class DebitWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(input: DebitWalletInput): Promise<DebitWalletOutput> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (wallet === null) {
      throw new WalletApplicationError("WALLET_NOT_FOUND");
    }

    const result = wallet.debit(
      input.operationId,
      input.amountCents,
      input.reason,
      input.occurredAt,
    );
    await this.walletRepository.save(wallet);

    return this.toOutput(result);
  }

  private toOutput(result: WalletMutationResult): DebitWalletOutput {
    return {
      applied: result.applied,
      balanceCents: result.wallet.balanceCents,
      ledgerEntry: result.ledgerEntry,
    };
  }
}
