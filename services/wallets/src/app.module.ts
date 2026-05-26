import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { BearerTokenPlayerGuard } from "./presentation/auth/bearer-token-player.guard";
import { walletProviders } from "./wallets.providers";

@Module({
  controllers: [WalletsController],
  providers: [BearerTokenPlayerGuard, ...walletProviders],
})
export class AppModule {}
