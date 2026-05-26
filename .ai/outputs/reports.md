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
