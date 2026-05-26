import { KeycloakJwtVerifier, type KeycloakJwtVerifierConfig } from "@crash/auth";
import {
  CashOutUseCase,
  CrashRoundUseCase,
  GetCurrentRoundUseCase,
  GetLeaderboardUseCase,
  GetPlayerBetsUseCase,
  GetRoundHistoryUseCase,
  OpenRoundUseCase,
  PlaceBetUseCase,
  RealtimeEventFactory,
  StartRoundUseCase,
  TickRoundEngineUseCase,
  VerifyRoundUseCase,
  type Clock,
  type IdGenerator,
  type MessageIdGenerator,
  type RealtimeEventBus,
  type RoundRepository,
  type SeedGenerator,
  type WalletCommandPublisher,
  WalletCommandFactory,
} from "./application";
import { ProvablyFairService } from "./domain";
import {
  CryptoSeedGenerator,
  InMemoryWalletCommandPublisher,
  InMemoryRoundRepository,
  SystemClock,
  UuidIdGenerator,
  UuidMessageIdGenerator,
} from "./infrastructure";
import { GamesRealtimeGateway } from "./presentation/gateways/games-realtime.gateway";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
export const CLOCK = Symbol("CLOCK");
export const ID_GENERATOR = Symbol("ID_GENERATOR");
export const SEED_GENERATOR = Symbol("SEED_GENERATOR");
export const MESSAGE_ID_GENERATOR = Symbol("MESSAGE_ID_GENERATOR");
export const KEYCLOAK_JWT_VERIFIER = Symbol("KEYCLOAK_JWT_VERIFIER");
export const REALTIME_EVENT_BUS = Symbol("REALTIME_EVENT_BUS");
export const WALLET_COMMAND_PUBLISHER = Symbol("WALLET_COMMAND_PUBLISHER");

export const gameProviders = [
  { provide: ROUND_REPOSITORY, useClass: InMemoryRoundRepository },
  { provide: CLOCK, useClass: SystemClock },
  { provide: ID_GENERATOR, useClass: UuidIdGenerator },
  { provide: SEED_GENERATOR, useClass: CryptoSeedGenerator },
  { provide: MESSAGE_ID_GENERATOR, useClass: UuidMessageIdGenerator },
  { provide: WALLET_COMMAND_PUBLISHER, useClass: InMemoryWalletCommandPublisher },
  { provide: ProvablyFairService, useClass: ProvablyFairService },
  { provide: RealtimeEventFactory, useClass: RealtimeEventFactory },
  { provide: WalletCommandFactory, useClass: WalletCommandFactory },
  { provide: GamesRealtimeGateway, useClass: GamesRealtimeGateway },
  { provide: REALTIME_EVENT_BUS, useExisting: GamesRealtimeGateway },
  {
    provide: KEYCLOAK_JWT_VERIFIER,
    useFactory: (): KeycloakJwtVerifier =>
      new KeycloakJwtVerifier(getKeycloakJwtVerifierConfig()),
  },
  {
    provide: OpenRoundUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      idGenerator: IdGenerator,
      seedGenerator: SeedGenerator,
      clock: Clock,
      provablyFairService: ProvablyFairService,
    ): OpenRoundUseCase =>
      new OpenRoundUseCase(
        roundRepository,
        idGenerator,
        seedGenerator,
        clock,
        provablyFairService,
      ),
    inject: [ROUND_REPOSITORY, ID_GENERATOR, SEED_GENERATOR, CLOCK, ProvablyFairService],
  },
  {
    provide: GetCurrentRoundUseCase,
    useFactory: (roundRepository: RoundRepository, clock: Clock): GetCurrentRoundUseCase =>
      new GetCurrentRoundUseCase(roundRepository, clock),
    inject: [ROUND_REPOSITORY, CLOCK],
  },
  {
    provide: PlaceBetUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      idGenerator: IdGenerator,
      clock: Clock,
      walletCommandPublisher: WalletCommandPublisher,
      walletCommandFactory: WalletCommandFactory,
      messageIdGenerator: MessageIdGenerator,
    ): PlaceBetUseCase =>
      new PlaceBetUseCase(
        roundRepository,
        idGenerator,
        clock,
        walletCommandPublisher,
        walletCommandFactory,
        messageIdGenerator,
      ),
    inject: [
      ROUND_REPOSITORY,
      ID_GENERATOR,
      CLOCK,
      WALLET_COMMAND_PUBLISHER,
      WalletCommandFactory,
      MESSAGE_ID_GENERATOR,
    ],
  },
  {
    provide: CashOutUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      clock: Clock,
      walletCommandPublisher: WalletCommandPublisher,
      walletCommandFactory: WalletCommandFactory,
      messageIdGenerator: MessageIdGenerator,
    ): CashOutUseCase =>
      new CashOutUseCase(
        roundRepository,
        clock,
        walletCommandPublisher,
        walletCommandFactory,
        messageIdGenerator,
      ),
    inject: [
      ROUND_REPOSITORY,
      CLOCK,
      WALLET_COMMAND_PUBLISHER,
      WalletCommandFactory,
      MESSAGE_ID_GENERATOR,
    ],
  },
  {
    provide: CrashRoundUseCase,
    useFactory: (roundRepository: RoundRepository, clock: Clock): CrashRoundUseCase =>
      new CrashRoundUseCase(roundRepository, clock),
    inject: [ROUND_REPOSITORY, CLOCK],
  },
  {
    provide: StartRoundUseCase,
    useFactory: (roundRepository: RoundRepository, clock: Clock): StartRoundUseCase =>
      new StartRoundUseCase(roundRepository, clock),
    inject: [ROUND_REPOSITORY, CLOCK],
  },
  {
    provide: VerifyRoundUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      provablyFairService: ProvablyFairService,
    ): VerifyRoundUseCase => new VerifyRoundUseCase(roundRepository, provablyFairService),
    inject: [ROUND_REPOSITORY, ProvablyFairService],
  },
  {
    provide: GetRoundHistoryUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      clock: Clock,
    ): GetRoundHistoryUseCase => new GetRoundHistoryUseCase(roundRepository, clock),
    inject: [ROUND_REPOSITORY, CLOCK],
  },
  {
    provide: GetPlayerBetsUseCase,
    useFactory: (roundRepository: RoundRepository): GetPlayerBetsUseCase =>
      new GetPlayerBetsUseCase(roundRepository),
    inject: [ROUND_REPOSITORY],
  },
  {
    provide: GetLeaderboardUseCase,
    useFactory: (roundRepository: RoundRepository): GetLeaderboardUseCase =>
      new GetLeaderboardUseCase(roundRepository),
    inject: [ROUND_REPOSITORY],
  },
  {
    provide: TickRoundEngineUseCase,
    useFactory: (
      roundRepository: RoundRepository,
      clock: Clock,
      openRoundUseCase: OpenRoundUseCase,
      realtimeEventBus: RealtimeEventBus,
      realtimeEventFactory: RealtimeEventFactory,
    ): TickRoundEngineUseCase =>
      new TickRoundEngineUseCase(
        roundRepository,
        clock,
        openRoundUseCase,
        realtimeEventBus,
        realtimeEventFactory,
      ),
    inject: [ROUND_REPOSITORY, CLOCK, OpenRoundUseCase, REALTIME_EVENT_BUS, RealtimeEventFactory],
  },
];

function getKeycloakJwtVerifierConfig(): KeycloakJwtVerifierConfig {
  return {
    issuer: process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game",
    jwksUrl:
      process.env.KEYCLOAK_JWKS_URL ??
      "http://localhost:8080/realms/crash-game/protocol/openid-connect/certs",
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client",
  };
}
