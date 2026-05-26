# Spec - Game Service

## Goal

Own the Crash Game lifecycle: rounds, bets, cashouts, crash settlement, history, WebSocket events, and provably fair verification.

## Round Lifecycle

States:

- `betting`
- `running`
- `crashed`
- `settled`

Rules:

- Only one active/current round exists at a time.
- Bets are accepted only in `betting`.
- Cashout is accepted only in `running`.
- Crash point is generated before betting opens.
- Server seed hash is visible before betting opens.
- Server seed is revealed after crash.

## Bet Rules

- One bet per player per round.
- Minimum amount: `100` cents.
- Maximum amount: `100000` cents.
- A pending bet becomes accepted only after wallet debit confirmation.
- Rejected wallet debit marks bet as rejected.
- Cashout payout is `amountCents * multiplier`, rounded down to cents.
- A cashed-out bet cannot cash out again.
- A lost bet remains debited.

## REST Endpoints

- `GET /rounds/current`
- `GET /rounds/history`
- `GET /rounds/:roundId/verify`
- `GET /bets/me`
- `POST /bet`
- `POST /bet/cashout`

## RabbitMQ Integration

Publish:

- `wallet.bet.debit.requested` after a valid bet request.
- `wallet.cashout.credit.requested` after valid cashout.

Consume:

- `wallet.bet.debited`
- `wallet.bet.debit.rejected`
- `wallet.cashout.credited`
- `wallet.cashout.credit.rejected`

## WebSocket Events

- Emit round state changes.
- Emit regular `round:tick` updates during running state.
- Emit bet/cashout updates as they happen.
- Clients reconnect by fetching `GET /rounds/current`.

## Acceptance Criteria

- Duplicate bet in same round returns conflict.
- Bet outside betting phase returns conflict.
- Cashout without accepted active bet returns conflict.
- Crash settles all non-cashed accepted bets as lost.
- Round history shows recent crash points and verification data.
