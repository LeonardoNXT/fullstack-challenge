import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  GameApplicationError,
  GetCurrentRoundUseCase,
  OpenRoundUseCase,
} from "./application";

@Injectable()
export class GamesBootstrapService implements OnModuleInit {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly openRoundUseCase: OpenRoundUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.getCurrentRoundUseCase.execute();
    } catch (error) {
      if (
        error instanceof GameApplicationError &&
        error.code === "CURRENT_ROUND_NOT_FOUND"
      ) {
        await this.openRoundUseCase.execute({
          bettingWindowMs: getNumberEnv("GAME_BETTING_WINDOW_MS", 10000),
          clientSeed: process.env.GAME_CLIENT_SEED ?? "crash-game",
          houseEdgeBps: getNumberEnv("GAME_HOUSE_EDGE_BPS", 100),
          growthBpsPerSecond: getNumberEnv("GAME_GROWTH_BPS_PER_SECOND", 1000),
        });
        return;
      }

      throw error;
    }
  }
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
