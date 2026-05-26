import type { PlayerId } from "@crash/contracts";
import type { WalletSnapshot } from "../../domain";
import { WalletApplicationError } from "../errors/wallet-application.error";
import type { WalletRepository } from "../ports/wallet.repository";

export interface GetWalletInput {
  readonly playerId: PlayerId;
}

export class GetWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(input: GetWalletInput): Promise<WalletSnapshot> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (wallet === null) {
      throw new WalletApplicationError("WALLET_NOT_FOUND");
    }

    return wallet.toSnapshot();
  }
}
