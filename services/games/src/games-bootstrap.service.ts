import { Injectable, OnModuleInit } from "@nestjs/common";
import { TickRoundEngineUseCase } from "./application";
import { getGamesRuntimeConfig } from "./games-runtime.config";

@Injectable()
export class GamesBootstrapService implements OnModuleInit {
  constructor(private readonly tickRoundEngineUseCase: TickRoundEngineUseCase) {}

  async onModuleInit(): Promise<void> {
    await this.tickRoundEngineUseCase.execute(getGamesRuntimeConfig());
  }
}
