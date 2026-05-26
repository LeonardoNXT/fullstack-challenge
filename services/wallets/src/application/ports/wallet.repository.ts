import type { PlayerId } from "@crash/contracts";
import type { Wallet } from "../../domain";

export interface WalletRepository {
  findByPlayerId(playerId: PlayerId): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
}
