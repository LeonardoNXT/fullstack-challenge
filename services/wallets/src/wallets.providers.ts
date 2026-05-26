import {
  KeycloakJwtVerifier,
  type KeycloakJwtVerifierConfig,
} from "@crash/auth";
import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase,
  type WalletRepository,
} from "./application";
import { InMemoryWalletRepository } from "./infrastructure";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
export const KEYCLOAK_JWT_VERIFIER = Symbol("KEYCLOAK_JWT_VERIFIER");

export const walletProviders = [
  {
    provide: WALLET_REPOSITORY,
    useClass: InMemoryWalletRepository,
  },
  {
    provide: KEYCLOAK_JWT_VERIFIER,
    useFactory: (): KeycloakJwtVerifier =>
      new KeycloakJwtVerifier(getKeycloakJwtVerifierConfig()),
  },
  {
    provide: CreateWalletUseCase,
    useFactory: (walletRepository: WalletRepository): CreateWalletUseCase =>
      new CreateWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: GetWalletUseCase,
    useFactory: (walletRepository: WalletRepository): GetWalletUseCase =>
      new GetWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: CreditWalletUseCase,
    useFactory: (walletRepository: WalletRepository): CreditWalletUseCase =>
      new CreditWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
  {
    provide: DebitWalletUseCase,
    useFactory: (walletRepository: WalletRepository): DebitWalletUseCase =>
      new DebitWalletUseCase(walletRepository),
    inject: [WALLET_REPOSITORY],
  },
];

function getKeycloakJwtVerifierConfig(): KeycloakJwtVerifierConfig {
  return {
    issuer:
      process.env.KEYCLOAK_ISSUER ??
      "http://localhost:8080/realms/crash-game",
    jwksUrl:
      process.env.KEYCLOAK_JWKS_URL ??
      "http://localhost:8080/realms/crash-game/protocol/openid-connect/certs",
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client",
  };
}
