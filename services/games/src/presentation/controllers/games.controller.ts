import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  CashOutUseCase,
  GetCurrentRoundUseCase,
  GetLeaderboardUseCase,
  GetPlayerBetsUseCase,
  GetRoundHistoryUseCase,
  PlaceBetUseCase,
  RealtimeEventFactory,
  type RealtimeEventBus,
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
import { REALTIME_EVENT_BUS } from "../../games.providers";

@Controller()
@ApiTags("games")
export class GamesController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
    private readonly getPlayerBetsUseCase: GetPlayerBetsUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
    @Inject(REALTIME_EVENT_BUS)
    private readonly realtimeEventBus: RealtimeEventBus,
    private readonly realtimeEventFactory: RealtimeEventFactory,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4")
  metrics(): string {
    const memory = process.memoryUsage();
    return [
      "# HELP crash_games_process_uptime_seconds Process uptime in seconds.",
      "# TYPE crash_games_process_uptime_seconds gauge",
      `crash_games_process_uptime_seconds ${process.uptime().toFixed(0)}`,
      "# HELP crash_games_heap_used_bytes Heap used in bytes.",
      "# TYPE crash_games_heap_used_bytes gauge",
      `crash_games_heap_used_bytes ${memory.heapUsed}`,
    ].join("\n");
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
  @ApiBearerAuth()
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
  async leaderboard(
    @Query("limit") limit?: string,
    @Query("window") window?: string,
  ): Promise<unknown> {
    try {
      return await this.getLeaderboardUseCase.execute(
        parseLimit(limit, 10),
        window === "week" ? "week" : "24h",
      );
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Post("bet")
  @UseGuards(KeycloakJwtPlayerGuard)
  @ApiBearerAuth()
  async placeBet(
    @Req() request: AuthenticatedRequest,
    @Body() body: PlaceBetRequestDto,
  ): Promise<unknown> {
    try {
      const bet = await this.placeBetUseCase.execute({
        playerId: request.user.playerId,
        username: request.user.username,
        amountCents: makeCents(body.amountCents),
        autoCashoutMultiplierBps:
          body.autoCashoutMultiplierBps === undefined
            ? undefined
            : makeMultiplierBps(body.autoCashoutMultiplierBps),
      });
      await this.realtimeEventBus.publish(this.realtimeEventFactory.betPlaced(bet));

      return bet;
    } catch (error) {
      throw mapGameError(error);
    }
  }

  @Post("bet/cashout")
  @UseGuards(KeycloakJwtPlayerGuard)
  @ApiBearerAuth()
  async cashOut(@Req() request: AuthenticatedRequest): Promise<unknown> {
    try {
      const result = await this.cashOutUseCase.execute(request.user.playerId);
      await this.realtimeEventBus.publish(
        this.realtimeEventFactory.betCashedOut(result.bet),
      );

      return result;
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
