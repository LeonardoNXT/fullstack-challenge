import { Controller, Get, Header, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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
@ApiTags("wallets")
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4")
  metrics(): string {
    const memory = process.memoryUsage();
    return [
      "# HELP crash_wallets_process_uptime_seconds Process uptime in seconds.",
      "# TYPE crash_wallets_process_uptime_seconds gauge",
      `crash_wallets_process_uptime_seconds ${process.uptime().toFixed(0)}`,
      "# HELP crash_wallets_heap_used_bytes Heap used in bytes.",
      "# TYPE crash_wallets_heap_used_bytes gauge",
      `crash_wallets_heap_used_bytes ${memory.heapUsed}`,
    ].join("\n");
  }

  @Post()
  @UseGuards(KeycloakJwtPlayerGuard)
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
