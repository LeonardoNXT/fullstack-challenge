import {
  KeycloakJwtVerifier,
  type KeycloakJwtVerifierConfig,
} from "@crash/auth";
import {
  CreateWalletUseCase,
  CreditWalletUseCase,
  DebitWalletUseCase,
  GetWalletUseCase,
  HandleWalletCommandUseCase,
  WalletEventFactory,
  type MessageIdGenerator,
  type WalletEventPublisher,
  type WalletRepository,
} from "./application";
import {
  RabbitmqWalletCommandConsumer,
  RabbitmqWalletEventPublisher,
  UuidMessageIdGenerator,
} from "./infrastructure";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/repositories/prisma-wallet.repository";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
export const KEYCLOAK_JWT_VERIFIER = Symbol("KEYCLOAK_JWT_VERIFIER");
export const MESSAGE_ID_GENERATOR = Symbol("MESSAGE_ID_GENERATOR");
export const WALLET_EVENT_PUBLISHER = Symbol("WALLET_EVENT_PUBLISHER");

export const walletProviders = [
  PrismaService,
  RabbitmqWalletCommandConsumer,
  {
    provide: WALLET_REPOSITORY,
    useFactory: (prisma: PrismaService): WalletRepository =>
      new PrismaWalletRepository(prisma),
    inject: [PrismaService],
  },
  {
    provide: MESSAGE_ID_GENERATOR,
    useClass: UuidMessageIdGenerator,
  },
  {
    provide: WALLET_EVENT_PUBLISHER,
    useClass: RabbitmqWalletEventPublisher,
  },
  {
    provide: WalletEventFactory,
    useClass: WalletEventFactory,
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
  {
    provide: HandleWalletCommandUseCase,
    useFactory: (
      debitWalletUseCase: DebitWalletUseCase,
      creditWalletUseCase: CreditWalletUseCase,
      eventFactory: WalletEventFactory,
      messageIdGenerator: MessageIdGenerator,
      walletEventPublisher: WalletEventPublisher,
    ): HandleWalletCommandUseCase =>
      new HandleWalletCommandUseCase(
        debitWalletUseCase,
        creditWalletUseCase,
        eventFactory,
        messageIdGenerator,
        walletEventPublisher,
      ),
    inject: [
      DebitWalletUseCase,
      CreditWalletUseCase,
      WalletEventFactory,
      MESSAGE_ID_GENERATOR,
      WALLET_EVENT_PUBLISHER,
    ],
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
