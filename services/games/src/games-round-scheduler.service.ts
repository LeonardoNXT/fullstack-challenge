import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { TickRoundEngineUseCase } from "./application";
import { getGamesRuntimeConfig } from "./games-runtime.config";

@Injectable()
export class GamesRoundSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GamesRoundSchedulerService.name);
  private interval: ReturnType<typeof setInterval> | undefined;
  private ticking = false;

  constructor(private readonly tickRoundEngineUseCase: TickRoundEngineUseCase) {}

  onModuleInit(): void {
    const config = getGamesRuntimeConfig();
    this.interval = setInterval(() => {
      void this.tick();
    }, config.schedulerIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
    }
  }

  private async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }

    this.ticking = true;
    try {
      const result = await this.tickRoundEngineUseCase.execute(getGamesRuntimeConfig());
      if (result.actions.length > 0) {
        this.logger.log(`Round engine actions: ${result.actions.join(",")}`);
      }
    } catch (error) {
      this.logger.error("Round engine tick failed", error);
    } finally {
      this.ticking = false;
    }
  }
}
