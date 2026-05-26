import type { TickRoundEngineInput } from "./application";

export interface GamesRuntimeConfig extends TickRoundEngineInput {
  readonly schedulerIntervalMs: number;
}

export function getGamesRuntimeConfig(): GamesRuntimeConfig {
  return {
    schedulerIntervalMs: getNumberEnv("GAME_SCHEDULER_INTERVAL_MS", 250),
    bettingWindowMs: getNumberEnv("GAME_BETTING_WINDOW_MS", 10000),
    settlementDelayMs: getNumberEnv("GAME_SETTLEMENT_DELAY_MS", 3000),
    clientSeed: process.env.GAME_CLIENT_SEED ?? "crash-game",
    houseEdgeBps: getNumberEnv("GAME_HOUSE_EDGE_BPS", 100),
    growthBpsPerSecond: getNumberEnv("GAME_GROWTH_BPS_PER_SECOND", 1000),
  };
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
