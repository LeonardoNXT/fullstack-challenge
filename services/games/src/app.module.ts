import { Module } from "@nestjs/common";
import { GamesBootstrapService } from "./games-bootstrap.service";
import { gameProviders } from "./games.providers";
import { KeycloakJwtPlayerGuard } from "./presentation/auth/keycloak-jwt-player.guard";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  controllers: [GamesController],
  providers: [KeycloakJwtPlayerGuard, GamesBootstrapService, ...gameProviders],
})
export class AppModule {}
