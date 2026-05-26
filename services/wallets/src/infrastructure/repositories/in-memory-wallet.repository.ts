import type { PlayerId } from "@crash/contracts";
import type { WalletRepository } from "../../application";
import { Wallet, type WalletSnapshot } from "../../domain";

export class InMemoryWalletRepository implements WalletRepository {
  private readonly walletsByPlayerId = new Map<PlayerId, WalletSnapshot>();

  async findByPlayerId(playerId: PlayerId): Promise<Wallet | null> {
    const snapshot = this.walletsByPlayerId.get(playerId);
    if (snapshot === undefined) {
      return null;
    }

    return Wallet.rehydrate(snapshot);
  }

  async save(wallet: Wallet): Promise<void> {
    this.walletsByPlayerId.set(wallet.playerId, wallet.toSnapshot());
  }

  clear(): void {
    this.walletsByPlayerId.clear();
  }
}
