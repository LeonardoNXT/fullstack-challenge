import { ApiProperty } from "@nestjs/swagger";
import type { Cents, PlayerId } from "@crash/contracts";
import type { WalletSnapshot } from "../../domain";

export class WalletResponseDto {
  @ApiProperty({ example: "keycloak-sub" })
  playerId: PlayerId;

  @ApiProperty({ example: 100000 })
  balanceCents: Cents;

  static fromSnapshot(snapshot: WalletSnapshot): WalletResponseDto {
    return {
      playerId: snapshot.playerId,
      balanceCents: snapshot.balanceCents,
    };
  }
}
