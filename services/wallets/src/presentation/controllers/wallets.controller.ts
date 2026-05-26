import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  CreateWalletUseCase,
  GetWalletUseCase,
  TEST_WALLET_INITIAL_BALANCE_CENTS,
} from "../../application";
import { KeycloakJwtPlayerGuard } from "../auth/keycloak-jwt-player.guard";
import type { AuthenticatedRequest } from "../auth/authenticated-player";
import { CreateWalletResponseDto } from "../dtos/create-wallet-response.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { WalletResponseDto } from "../dtos/wallet-response.dto";
import { mapWalletError } from "./wallets.http-error.mapper";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(KeycloakJwtPlayerGuard)
  async create(@Req() request: AuthenticatedRequest): Promise<CreateWalletResponseDto> {
    try {
      const result = await this.createWalletUseCase.execute({
        playerId: request.user.playerId,
        initialBalanceCents: TEST_WALLET_INITIAL_BALANCE_CENTS,
      });

      return CreateWalletResponseDto.fromResult(result.created, result.wallet);
    } catch (error) {
      throw mapWalletError(error);
    }
  }

  @Get("me")
  @UseGuards(KeycloakJwtPlayerGuard)
  async me(@Req() request: AuthenticatedRequest): Promise<WalletResponseDto> {
    try {
      const wallet = await this.getWalletUseCase.execute({
        playerId: request.user.playerId,
      });

      return WalletResponseDto.fromSnapshot(wallet);
    } catch (error) {
      throw mapWalletError(error);
    }
  }
}
