# Spec - Wallet Service

## Goal

Own player balances and financial ledger using integer cents.

## Wallet Rules

- One wallet per player.
- Balance is stored as integer cents.
- Balance must never become negative.
- Wallet creation is idempotent for a player.
- Test user should have initial balance, suggested `100000` cents.

## Ledger Rules

- Every balance change creates a ledger entry.
- Ledger entries use unique operation ids.
- Duplicate operation ids do not apply side effects twice.
- Debit requires sufficient funds.
- Credit always increases balance unless operation was already applied.
- Incoming messages are deduplicated through an inbox.
- Published financial results are stored in a transactional outbox before delivery.

## REST Endpoints

- `POST /`
- `GET /me`
- `GET /health`

Public via Kong:

- `POST /wallets`
- `GET /wallets/me`
- `GET /wallets/health`

## RabbitMQ Consumers

Consume:

- `wallet.bet.debit.requested`
- `wallet.cashout.credit.requested`
- `wallet.bet.refund.requested`

Publish:

- `wallet.bet.debited`
- `wallet.bet.debit.rejected`
- `wallet.cashout.credited`
- `wallet.cashout.credit.rejected`
- `wallet.bet.refunded`

## Acceptance Criteria

- Insufficient balance rejects debit and publishes rejection.
- Duplicate debit request does not debit twice.
- Duplicate credit request does not credit twice.
- `GET /wallets/me` returns current balance in cents.
- Outbox/inbox tables make message replay safe.
