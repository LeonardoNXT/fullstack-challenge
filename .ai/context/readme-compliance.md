# README Compliance Matrix

Use this file before implementation and review. If README and `.ai` disagree, README wins and `.ai` must be updated.

## Required / Eliminatory

| README item | AI spec location | Status |
| --- | --- | --- |
| `bun run docker:up` starts everything without manual steps | `specs/infra.md` | Planned, first fix started |
| Gameplay bet -> multiplier -> cashout/crash -> settlement | `specs/game-service.md`, `specs/wallet-service.md`, `specs/frontend.md` | Planned |
| Separate Game and Wallet services | `context/architecture.md` | Covered |
| Async Game/Wallet communication via RabbitMQ/SQS | `context/architecture.md`, `skills/api-integration.md` | Covered, RabbitMQ chosen |
| Real-time sync across multiple tabs | `specs/realtime.md`, `specs/testing.md` | Covered |
| Money precision, no floating point | `context/conventions.md`, `skills/typescript.md` | Covered |
| Backend validates JWTs from IdP | `specs/auth.md` | Covered, Keycloak chosen |
| Unit and E2E tests exist | `specs/testing.md` | Covered |

## Preferred Stack Choices

| README preference | Chosen direction |
| --- | --- |
| Runtime Bun latest | Use Bun everywhere |
| Backend NestJS strict TypeScript | Keep NestJS, strict TS |
| PostgreSQL with ORM | PostgreSQL + Prisma preferred |
| RabbitMQ/Kafka/SQS | RabbitMQ chosen because compose provides it |
| Kong/AWS API Gateway | Kong chosen because compose provides it |
| Keycloak/Auth0/Okta | Keycloak chosen because realm is provided |
| WebSocket with Socket.IO or ws | Socket.IO preferred for NestJS/frontend speed |
| Frontend Next/Vite/TanStack Start | TanStack Start preferred; Vite fallback only if delivery risk |
| Tailwind CSS v4 + shadcn/ui | Tailwind v4 + shadcn/ui |
| TanStack Query + Zustand/Context | TanStack Query + Zustand |
| Bun test runner or Vitest | Bun tests for backend, Vitest acceptable for frontend |
| Swagger/OpenAPI | `@nestjs/swagger` in both services |
| Docker Compose | Keep compose as local orchestration |

## Scoring Focus

| Criterion | How specs address it |
| --- | --- |
| DDD and architecture, 25% | Separate bounded contexts, domain/application/infrastructure/presentation, RabbitMQ saga-style flow |
| Code quality, 20% | Strict TS, conventions, stable DTOs, no dead code |
| Tests, 20% | Domain unit tests, API E2E, browser E2E bonus |
| Frontend/UX, 15% | Dark casino UI, animation, loading/error states, responsive layout |
| Provably fair, 10% | Hash/HMAC seed verification endpoint and tests |
| Git history, 10% | Small commit workflow |

## Bonus Targeting

High-priority differentiators:

- Outbox/Inbox transactional processing.
- Auto cashout.
- Deterministic E2E seed/script.
- Playwright browser E2E.
- Rate limiting.
- Formula display in UI.

Secondary differentiators:

- Observability.
- Leaderboard.
- Sound effects.
- CI pipeline.
- Storybook.

Implement secondary differentiators after eliminatory flow is reliable, unless they are cheap and naturally fit the current commit.
