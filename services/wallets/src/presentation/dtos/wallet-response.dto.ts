import type { Cents, PlayerId } from "@crash/contracts";
import type { WalletSnapshot } from "../../domain";

export class WalletResponseDto {
  playerId: PlayerId;
  balanceCents: Cents;

  static fromSnapshot(snapshot: WalletSnapshot): WalletResponseDto {
    return {
      playerId: snapshot.playerId,
      balanceCents: snapshot.balanceCents,
    };
  }
}
