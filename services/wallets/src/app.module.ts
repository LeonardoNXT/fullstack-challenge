import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { KeycloakJwtPlayerGuard } from "./presentation/auth/keycloak-jwt-player.guard";
import { walletProviders } from "./wallets.providers";

@Module({
  controllers: [WalletsController],
  providers: [KeycloakJwtPlayerGuard, ...walletProviders],
})
export class AppModule {}
