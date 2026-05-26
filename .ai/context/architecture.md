# Architecture

## System Components

- Frontend: TanStack Start React app served on port `3000`; Vite is acceptable only if TanStack Start blocks delivery.
- Kong: API gateway on `8000`, routes public client traffic to backend services.
- Keycloak: identity provider on `8080`, realm `crash-game`.
- Games Service: NestJS service on `4001`, owns rounds, bets, crash engine, WebSocket, and provably fair data.
- Wallets Service: NestJS service on `4002`, owns wallet balances and ledger.
- RabbitMQ: async integration between Games and Wallets.
- Postgres: separate databases `games` and `wallets`.

## Request Flow

1. User logs in through Keycloak.
2. Frontend stores access token in browser state.
3. Frontend calls REST through Kong:
   - `/games/*` to Games Service.
   - `/wallets/*` to Wallets Service.
4. Authenticated REST calls include `Authorization: Bearer <jwt>`.
5. Services validate JWTs and use token `sub` as `playerId`.
6. Player actions are REST-only.
7. Server real-time updates are WebSocket-only.

## Service Boundaries

Games owns:

- Round lifecycle.
- Bet lifecycle.
- Cashout eligibility.
- Crash point generation.
- Provably fair verification data.
- WebSocket events.

Wallets owns:

- Wallet creation.
- Balance.
- Ledger entries.
- Financial idempotency.
- Rejecting insufficient balance.

Games must not write to the wallets database. Wallets must not decide game state.

## RabbitMQ Contract

Use RabbitMQ for all cross-service financial messages. Every message must include:

- `eventId`
- `correlationId`
- `occurredAt`
- `playerId`
- `roundId` when relevant
- `betId` when relevant
- `amountCents` when relevant

Initial commands:

- `wallet.bet.debit.requested`
- `wallet.cashout.credit.requested`
- `wallet.bet.refund.requested`

Initial events:

- `wallet.bet.debited`
- `wallet.bet.debit.rejected`
- `wallet.cashout.credited`
- `wallet.cashout.credit.rejected`
- `wallet.bet.refunded`

Delivery model:

- At-least-once delivery.
- Idempotent consumers.
- Inbox table per service for processed message ids.
- Transactional outbox per service for financial/gameplay events.

## Time And Multiplier

The multiplier shown to clients must be derived from server truth:

- `round.startedAt`
- deterministic multiplier curve
- `round.crashPoint`

WebSocket ticks are presentation updates, not source of truth.

## Persistence

Preferred ORM: Prisma.

Games database:

- rounds
- bets
- processed messages
- outbox messages

Wallets database:

- wallets
- ledger entries
- processed messages
- outbox messages

## Documentation

Both backend services must expose Swagger/OpenAPI generated with `@nestjs/swagger`. The final README must explain setup, architecture decisions, message flows, provably fair verification, trade-offs, and test commands.

## Differentiators Targeted

Implement these README bonus items when eliminatory flow is stable:

- Outbox/Inbox transactional processing.
- Auto cashout.
- Deterministic seed/script for E2E scenarios.
- Basic observability.
- Playwright browser E2E.
- Rate limiting through Kong or application middleware.
- Leaderboard.
- Formula display in the UI.
- Optional sound effects and Storybook after gameplay confidence is high.
