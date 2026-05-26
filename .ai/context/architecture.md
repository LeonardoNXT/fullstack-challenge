# Architecture

## System Components

- Frontend: Vite React app served on port `3000`.
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
- Outbox is a bonus, but the implementation should not make it impossible to add.

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
- optional outbox

Wallets database:

- wallets
- ledger entries
- processed messages
- optional outbox
