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
  StartRoundUseCase,
  VerifyRoundUseCase,
  type Clock,
  type IdGenerator,
  type RoundRepository,
  type SeedGenerator,
} from "./application";
import { ProvablyFairService } from "./domain";
import {
  CryptoSeedGenerator,
  InMemoryRoundRepository,
  SystemClock,
  UuidIdGenerator,
} from "./infrastructure";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
export const CLOCK = Symbol("CLOCK");
export const ID_GENERATOR = Symbol("ID_GENERATOR");
export const SEED_GENERATOR = Symbol("SEED_GENERATOR");
export const KEYCLOAK_JWT_VERIFIER = Symbol("KEYCLOAK_JWT_VERIFIER");

export const gameProviders = [
  { provide: ROUND_REPOSITORY, useClass: InMemoryRoundRepository },
  { provide: CLOCK, useClass: SystemClock },
  { provide: ID_GENERATOR, useClass: UuidIdGenerator },
  { provide: SEED_GENERATOR, useClass: CryptoSeedGenerator },
  { provide: ProvablyFairService, useClass: ProvablyFairService },
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
    ): PlaceBetUseCase => new PlaceBetUseCase(roundRepository, idGenerator, clock),
    inject: [ROUND_REPOSITORY, ID_GENERATOR, CLOCK],
  },
  {
    provide: CashOutUseCase,
    useFactory: (roundRepository: RoundRepository, clock: Clock): CashOutUseCase =>
      new CashOutUseCase(roundRepository, clock),
    inject: [ROUND_REPOSITORY, CLOCK],
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
