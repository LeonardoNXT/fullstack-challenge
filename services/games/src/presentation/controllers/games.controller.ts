import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  CashOutUseCase,
  GetCurrentRoundUseCase,
  GetLeaderboardUseCase,
  GetPlayerBetsUseCase,
  GetRoundHistoryUseCase,
  PlaceBetUseCase,
  VerifyRoundUseCase,
} from "../../application";
import {
  asRoundId,
  makeCents,
  makeMultiplierBps,
  type PublicRound,
} from "@crash/contracts";
import { KeycloakJwtPlayerGuard } from "../auth/keycloak-jwt-player.guard";
import type { AuthenticatedRequest } from "../auth/authenticated-player";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { mapGameError } from "./games.http-error.mapper";

@Controller()
export class GamesController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
    private readonly getPlayerBetsUseCase: GetPlayerBetsUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  async currentRound(): Promise<PublicRound> {
    try {
      return await this.getCurrentRoundUseCase.execute();
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Get("rounds/history")
  async roundHistory(@Query("limit") limit?: string): Promise<readonly PublicRound[]> {
    try {
      return await this.getRoundHistoryUseCase.execute(parseLimit(limit, 20));
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Get("rounds/:roundId/verify")
  async verifyRound(@Param("roundId") roundId: string): Promise<unknown> {
    try {
      return await this.verifyRoundUseCase.execute(asRoundId(roundId));
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Get("bets/me")
  @UseGuards(KeycloakJwtPlayerGuard)
  async myBets(
    @Req() request: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ): Promise<unknown> {
    try {
      return await this.getPlayerBetsUseCase.execute(
        request.user.playerId,
        parseLimit(limit, 50),
      );
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Get("leaderboard")
  async leaderboard(@Query("limit") limit?: string): Promise<unknown> {
    try {
      return await this.getLeaderboardUseCase.execute(parseLimit(limit, 10));
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Post("bet")
  @UseGuards(KeycloakJwtPlayerGuard)
  async placeBet(
    @Req() request: AuthenticatedRequest,
    @Body() body: PlaceBetRequestDto,
  ): Promise<unknown> {
    try {
      return await this.placeBetUseCase.execute({
        playerId: request.user.playerId,
        username: request.user.username,
        amountCents: makeCents(body.amountCents),
        autoCashoutMultiplierBps:
          body.autoCashoutMultiplierBps === undefined
            ? undefined
            : makeMultiplierBps(body.autoCashoutMultiplierBps),
      });
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Post("bet/cashout")
  @UseGuards(KeycloakJwtPlayerGuard)
  async cashOut(@Req() request: AuthenticatedRequest): Promise<unknown> {
    try {
      return await this.cashOutUseCase.execute(request.user.playerId);
    } catch (error) {
      throw mapGameError(error);
    }
  }
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 100);
}
