# AI Implementation Reports

## 2026-05-25 - Project Memory Created

Created the `.ai` implementation memory structure requested by the user.

Added:

- Context documents for overview, architecture, routes, conventions, and glossary.
- Specs for auth, game service, wallet service, provably fair, realtime, frontend, UI system, dashboard, audios, infra, and testing.
- Skills for TypeScript, React frontend, API integration, state management, and testing.
- Workflows for feature implementation, bug fixing, refactoring, and code review.
- ADR-0001 documenting the `.ai` project memory structure.

Next recommended implementation step:

- Start with `specs/infra.md` and fix Docker env/bootstrap so `docker compose config` and `bun run docker:up` can succeed.

## 2026-05-25 - Compose Env Bootstrap

Implemented the first infrastructure fix from `specs/infra.md`.

Changed:

- Updated `docker-compose.yml` so Games and Wallets receive Docker runtime env vars from explicit `environment` blocks.
- Kept `.env.example` as the template for running each service outside Docker, as described in `README.md`.

Reason:

- The repository must boot without manually copying env files.
- `docker compose config` previously failed because `services/games/.env` and `services/wallets/.env` were not present.
- The README says `.env.example` should be copied to `.env` only before running outside Docker; Docker setup should remain manual-step-free.

Remaining infrastructure work:

- Add frontend service after frontend scaffold exists.
- Add automated migrations and seed data when persistence is implemented.
- Validate full `bun run docker:up` once container builds are ready.

## 2026-05-25 - README Compliance Audit

Reread the full `README.md` and compared it against the `.ai` spec-driven design.

Adjusted:

- Added `context/readme-compliance.md` as the checklist tying README requirements, preferred stack, scoring criteria, and bonuses to `.ai` specs.
- Promoted preferred stack choices into the specs: Keycloak, Kong, RabbitMQ, PostgreSQL, NestJS, Bun, TanStack, Tailwind v4, shadcn/ui, and Swagger/OpenAPI.
- Updated frontend direction from Vite-first to TanStack Start-first, with Vite only as a delivery-risk fallback.
- Promoted Outbox/Inbox from optional future work to core architecture for financial/game messaging reliability.
- Added specs for bonus differentiators and OpenAPI.

Implementation guidance:

- Deliver eliminatory flow first, but design schemas and interfaces so Tier 1 bonuses are part of the main implementation rather than bolted on later.

## 2026-05-25 - Shared Contracts Package

Implemented the next small task from the plan: shared contracts and primitives.

Added:

- `packages/contracts` as private workspace package `@crash/contracts`.
- Branded primitive types for ids, cents, and multiplier basis points.
- Integer-only money helpers for parsing, formatting, bet bounds, and payout calculation.
- Wallet RabbitMQ exchange/routing key constants and typed message contracts.
- Public game DTO types for rounds and bets.
- Bun tests for money, multiplier, and event constants.

Validation:

- `bun test tests` from `packages/contracts` passed 9 tests.
- Bun printed a Windows `EPERM` warning while reading the workspace root, but the command exited successfully with 0 failures.

Next recommended implementation step:

- Build the Wallet domain and ledger using `@crash/contracts` money primitives.

## 2026-05-25 - Wallet Domain And Ledger

Implemented the Wallet domain core.

Added:

- `services/wallets/src/domain/entities/wallet.ts` with wallet balance, credit, debit, rehydrate, snapshot, and ledger behavior.
- `services/wallets/src/domain/errors/wallet-domain.error.ts` with stable domain error codes.
- `services/wallets/tests/unit/wallet.test.ts` covering creation, credit, debit, insufficient balance, duplicate operations, invalid amounts, and snapshot safety.
- `OperationId` primitive in `@crash/contracts`.
- Workspace dependency from Wallets to `@crash/contracts`.
- Minimal `frontend/package.json` so the root workspace declaration is structurally valid before the real frontend scaffold.

Validation:

- `bun test services/wallets/tests/unit packages/contracts/tests` from the repo root passed 18 tests.

Environment note:

- `bun install` could not complete in this machine because package downloads fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- Running `bun test tests/unit` from inside `services/wallets` also hit a Windows sandbox `EPERM` while reading the shared package source. Running the tests from the repo root works.

Next recommended implementation step:

- Add Wallet application use cases and an in-memory repository boundary before introducing Prisma persistence.

## 2026-05-26 - Wallet Application Use Cases

Implemented the Wallet application layer.

Added:

- Wallet repository port in `services/wallets/src/application/ports`.
- Use cases for creating, getting, crediting, and debiting wallets.
- Application error for missing wallet.
- In-memory wallet repository in `services/wallets/src/infrastructure/repositories`.
- Unit tests for idempotent creation, wallet lookup, credit/debit persistence, duplicate operation handling, insufficient balance, and missing-wallet errors.

Validation:

- `bun test services/wallets/tests/unit packages/contracts/tests` from the repo root passed 26 tests.

Next recommended implementation step:

- Introduce Wallet REST endpoints wired to the application use cases with an in-memory repository first, then replace the repository with Prisma persistence.

## 2026-05-26 - Wallet REST Endpoints With In-Memory Repository

Implemented the first Wallet presentation wiring.

Added:

- `POST /` on Wallets Service to create the authenticated player's wallet.
- `GET /me` on Wallets Service to return the authenticated player's wallet.
- Wallet response DTOs.
- HTTP error mapper for Wallet application/domain errors.
- Nest providers connecting use cases to `InMemoryWalletRepository`.
- Temporary bearer-token player guard that requires a bearer token and extracts `sub` / `preferred_username` from the JWT payload.
- Default test wallet balance constant of `100000` cents for wallet creation.

Important limitation:

- The temporary guard does not validate JWT signature/JWKS yet. It only enforces bearer-token shape and extracts player identity. Replace it with Keycloak validation in the auth task before treating authentication as complete.
- Controller-level tests were not kept because this local environment cannot install Nest dependencies yet (`bun install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Domain/application tests still run.

Validation:

- `bun test services/wallets/tests/unit packages/contracts/tests` from the repo root passed 26 tests.

Next recommended implementation step:

- Implement real Keycloak JWT validation for backend auth, then add controller/API tests once dependencies install successfully.

## 2026-05-26 - Keycloak JWT Verification

Implemented real JWT validation for Wallet authenticated endpoints.

Added:

- `packages/auth` workspace package with a dependency-free `KeycloakJwtVerifier`.
- RS256 signature validation through WebCrypto and Keycloak JWKS.
- Claim validation for issuer, expiration, and configured client id through `aud` or `azp`.
- Tests for valid token verification, audience handling, invalid issuer, invalid client, and tampered signatures.
- `KeycloakJwtPlayerGuard` in Wallets Service, replacing the temporary payload-only bearer guard.
- Wallet env settings for `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URL`, and `KEYCLOAK_CLIENT_ID`.

Docker auth configuration:

- `KEYCLOAK_ISSUER` stays `http://localhost:8080/realms/crash-game` because browser-issued tokens use the public localhost issuer.
- `KEYCLOAK_JWKS_URL` uses `http://keycloak:8080/.../certs` in Docker so the Wallet container can reach Keycloak internally.

Validation:

- `bun test packages/auth/tests packages/contracts/tests services/wallets/tests/unit` passed 31 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Next recommended implementation step:

- Add the same auth package to Games when authenticated game endpoints are introduced.

## 2026-05-26 - Games Domain And Provably Fair

Implemented the first pure Games domain slice.

Added:

- `ProvablyFairService` with SHA-256 server seed hashing, HMAC-SHA256 crash point calculation, house edge support, and verification payload.
- `Bet` entity with pending/accepted/rejected/cashed_out/lost status transitions, integer payout calculation, and auto-cashout target storage.
- `Round` aggregate with betting/running/crashed/settled lifecycle, one bet per player, server-time multiplier calculation, manual cashout, auto cashout, crash settlement, and snapshots.
- Games domain error codes.
- Games dependency on `@crash/contracts`.
- Unit tests for provably fair, bet rules, round transitions, duplicate bet prevention, manual cashout, auto cashout, and crash loss settlement.

Validation:

- `bun test services/games/tests/unit packages/contracts/tests` passed 26 tests.
- `bun test packages/auth/tests packages/contracts/tests services/wallets/tests/unit services/games/tests/unit` passed 48 tests.

Next recommended implementation step:

- Add Games application use cases and an in-memory round repository/engine boundary before wiring REST/WebSocket/RabbitMQ.

## 2026-05-26 - Games Application Use Cases

Implemented the first Games application layer.

Added:

- Round repository, clock, id generator, and seed generator ports.
- In-memory round repository plus system/crypto/UUID adapters.
- Use cases for opening a round, getting the current round, placing bets, accepting/rejecting wallet debit outcomes, starting a round, cashing out, crashing a round, and verifying provably fair data.
- Public round/bet mapping for REST/WebSocket-facing views.
- `serverSeed` storage in the round snapshot so past rounds can expose verification data.
- `asRoundId` and `asBetId` helpers in `@crash/contracts`.
- Unit tests covering current round retrieval, bet placement, wallet debit outcomes, start/cashout, crash settlement, verification, missing current round, and duplicate bet errors.

Validation:

- `bun test packages/auth/tests packages/contracts/tests services/wallets/tests/unit services/games/tests/unit` passed 56 tests.

Next recommended implementation step:

- Expose Games REST endpoints using the application use cases and in-memory repository, then add the Keycloak guard to authenticated game endpoints.

## 2026-05-26 - Games REST Endpoints With In-Memory Repository

Implemented the first Games presentation wiring.

Added:

- REST endpoints for current round, round history, provably fair verification, player bets, leaderboard, placing bets, and cashout.
- Keycloak JWT guard for authenticated Games endpoints using the shared `@crash/auth` verifier.
- Games providers connecting use cases to in-memory repository, system clock, UUID ids, crypto seed generator, and provably fair service.
- Bootstrap service that opens an initial in-memory round on service startup.
- Request DTO for placing bets and HTTP error mapping for application/domain/body parsing errors.
- Games env settings for Keycloak and initial round configuration.
- Application use cases for round history, player bets, and leaderboard.

Validation:

- `bun test packages/auth/tests packages/contracts/tests services/wallets/tests/unit services/games/tests/unit` passed 58 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Important limitation:

- The current Games REST wiring still uses in-memory state and does not publish RabbitMQ wallet debit/credit commands yet. Placing a bet returns a pending bet until the later messaging integration accepts/rejects it.

Next recommended implementation step:

- Add a round scheduler/engine service to move rounds through betting, running, crash, and settlement automatically, then connect WebSocket events.

## 2026-05-26 - Games Round Scheduler

Implemented the automatic in-memory round lifecycle engine.

Added:

- `TickRoundEngineUseCase` to drive the round lifecycle from application code.
- Automatic transitions from no round -> betting, betting -> running, running -> crashed, crashed -> settled -> next betting round.
- Auto cashout execution during running ticks.
- Configurable scheduler interval, betting window, settlement delay, client seed, house edge, and multiplier growth.
- `GamesRoundSchedulerService` using `setInterval` without adding new dependencies.
- `GamesRuntimeConfig` helper used by both bootstrap and scheduler.
- Unit tests covering opening, starting, auto cashout, crashing, settlement, and opening the next round.

Validation:

- `bun test packages/auth/tests packages/contracts/tests services/wallets/tests/unit services/games/tests/unit` passed 63 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Important limitation:

- The scheduler mutates in-memory state only. Persistence, RabbitMQ settlement side effects, and WebSocket broadcasting still need to be connected.

Next recommended implementation step:

- Add WebSocket event infrastructure for round lifecycle and bet/cashout updates, using scheduler tick output as the source for broadcasts.

## 2026-05-26 - Games Realtime Events And WebSocket Gateway

Implemented the first realtime broadcasting slice for Games.

Added:

- Realtime event contracts for round lifecycle, round ticks, bet placement, wallet acceptance/rejection, and cashout.
- `RealtimeEventFactory` to map scheduler/use-case outputs into WebSocket-safe payloads.
- `RealtimeEventBus` port plus an in-memory implementation for unit tests.
- Socket.IO Nest gateway prepared to emit events by event type.
- Scheduler integration so round opening, start, crash, auto cashout, and ticks can be broadcast.
- REST controller integration so placed and cashed-out bets publish realtime events.
- Bet use cases now return bet snapshots where broadcasting needs the final domain state.
- Unit tests covering event mapping, event ordering, in-memory publishing, and scheduler broadcast behavior.

Validation:

- `bun test packages\auth\tests packages\contracts\tests services\wallets\tests\unit services\games\tests\unit` passed 67 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Important limitation:

- `services/games/package.json` now declares Socket.IO/Nest WebSocket dependencies, but `bun install` still cannot download packages in this machine because registry requests fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- Realtime broadcasting is in-memory/process-local for now. After RabbitMQ and persistence are connected, wallet updates and cross-service events should publish through the same event port.

Next recommended implementation step:

- Add RabbitMQ wallet command/event integration so Games can request bet debits and cashout credits, and Wallets can publish accepted/rejected/credited outcomes idempotently.

## 2026-05-26 - Wallet Command/Event Application Flow

Implemented the application-level financial messaging flow between Games and Wallets.

Added:

- Event/correlation id helpers in `@crash/contracts`.
- Games `WalletCommandPublisher` port and in-memory test publisher.
- Games `WalletCommandFactory` for `wallet.bet.debit.requested` and `wallet.cashout.credit.requested`.
- Games message id generator adapter.
- `PlaceBetUseCase` now publishes a debit command after creating a pending bet when a publisher is configured.
- `CashOutUseCase` now publishes a cashout credit command after server-side cashout when a publisher is configured.
- Wallets `HandleWalletCommandUseCase` to process bet debit, cashout credit, and refund commands.
- Wallets `WalletEventFactory` for debited/credited/refunded/rejected outcomes.
- Wallet event publisher port and in-memory test publisher.
- Wallet command processing uses deterministic operation ids derived from `betId`, `cashout:${betId}`, and `refund:${betId}` so duplicate messages do not double debit or credit.
- Unit tests for Games command publication and Wallet command handling/idempotency.

Validation:

- `bun test packages\auth\tests packages\contracts\tests services\wallets\tests\unit services\games\tests\unit` passed 73 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Important limitation:

- This slice wires the message contracts and application behavior, but the concrete RabbitMQ adapter is still pending.
- Dependency installation is still blocked locally by `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, so adapters that require new broker packages should be added once package resolution is fixed or handled with the existing runtime stack.

Next recommended implementation step:

- Add concrete RabbitMQ adapters/consumers for the existing wallet command/event ports, then connect wallet result events back into Games acceptance/rejection/cashout settlement paths.

## 2026-05-26 - Games Wallet Event Handling

Implemented the Games-side handler for Wallet result events.

Added:

- `HandleWalletEventUseCase` to consume Wallet events and update Games bet state.
- `ProcessedWalletEventStore` port plus in-memory implementation for inbox-style deduplication by `eventId`.
- Games provider wiring for `AcceptBetDebitUseCase`, `RejectBetDebitUseCase`, and `HandleWalletEventUseCase`.
- Realtime publishing when wallet debit confirmation accepts or rejects a bet.
- Unit tests for accepted debit, rejected debit, and duplicate Wallet event handling.

Validation:

- `bun test packages\auth\tests packages\contracts\tests services\wallets\tests\unit services\games\tests\unit` passed 76 tests.
- `docker compose config` succeeded. Docker still prints the local `C:\Users\Leona\.docker\config.json` permission warning, but the command exits successfully.

Important limitation:

- This is still broker-agnostic application wiring. RabbitMQ consumers/producers are the remaining piece to move these messages between containers at runtime.
- Cashout credit confirmation is recorded as processed, but it does not mutate the bet because the bet is already cashed out synchronously on the Games side before the wallet credit command is sent.

Next recommended implementation step:

- Add concrete RabbitMQ publisher/consumer adapters for the existing ports, using the current command/event handlers as the only application boundary.

## 2026-05-26 - Docker Workspace Build Fix

Fixed Docker builds after introducing monorepo workspace packages.

Changed:

- Updated `docker-compose.yml` so Games and Wallets build from the repository root context.
- Updated `services/games/Dockerfile` and `services/wallets/Dockerfile` so `bun install` runs with the root workspace visible.
- Added root `.dockerignore` to keep local `node_modules`, env files, tests, and editor artifacts out of runtime images.

Reason:

- Service Dockerfiles previously copied only each service `package.json`, so Bun could not resolve `@crash/auth` and `@crash/contracts` workspace dependencies inside Docker.

Validation:

- `docker compose config` succeeded.
- `docker compose build games wallets` succeeded and built both runtime images.
- `bun test packages\auth\tests packages\contracts\tests services\wallets\tests\unit services\games\tests\unit` passed 76 tests.
