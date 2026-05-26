import { makeCents, type Cents, type PlayerId } from "@crash/contracts";
import { Wallet, type WalletSnapshot } from "../../domain";
import type { WalletRepository } from "../ports/wallet.repository";

export interface CreateWalletInput {
  readonly playerId: PlayerId;
  readonly initialBalanceCents?: Cents;
}

export interface CreateWalletOutput {
  readonly created: boolean;
  readonly wallet: WalletSnapshot;
}

export class CreateWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(input: CreateWalletInput): Promise<CreateWalletOutput> {
    const existingWallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (existingWallet !== null) {
      return { created: false, wallet: existingWallet.toSnapshot() };
    }

    const wallet = Wallet.create(input.playerId, input.initialBalanceCents ?? makeCents(0));
    await this.walletRepository.save(wallet);

    return { created: true, wallet: wallet.toSnapshot() };
  }
}
