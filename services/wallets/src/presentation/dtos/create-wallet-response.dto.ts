import { WalletResponseDto } from "./wallet-response.dto";
import type { WalletSnapshot } from "../../domain";

export class CreateWalletResponseDto extends WalletResponseDto {
  created: boolean;

  static fromResult(created: boolean, wallet: WalletSnapshot): CreateWalletResponseDto {
    return {
      ...WalletResponseDto.fromSnapshot(wallet),
      created,
    };
  }
}
