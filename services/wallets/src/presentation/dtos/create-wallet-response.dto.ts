import { ApiProperty } from "@nestjs/swagger";
import { WalletResponseDto } from "./wallet-response.dto";
import type { WalletSnapshot } from "../../domain";

export class CreateWalletResponseDto extends WalletResponseDto {
  @ApiProperty({ example: true })
  created: boolean;

  static fromResult(created: boolean, wallet: WalletSnapshot): CreateWalletResponseDto {
    return {
      ...WalletResponseDto.fromSnapshot(wallet),
      created,
    };
  }
}
