# Spec - Testing

## Goal

Provide enough tests to prove domain rules and core user flows.

## Unit Tests

Games:

- Round state transitions.
- Bet validation.
- Duplicate bet prevention.
- Cashout payout calculation.
- Provably fair determinism.

Wallets:

- Wallet creation.
- Credit.
- Debit.
- Insufficient balance.
- Duplicate operation id.
- No floating point money behavior.

## E2E Tests

- Create/read wallet.
- Place bet, multiplier runs, cashout, balance updates.
- Place bet, crash, bet loses.
- Reject insufficient balance.
- Reject duplicate bet.
- Reject bet during running phase.
- Reject cashout without active accepted bet.

## Frontend Tests

- Render dashboard states.
- Validate bet form.
- Disable/enable bet and cashout controls by phase.
- API error toast behavior.

## Playwright Tests

- Login with Keycloak test user.
- Create/read wallet.
- Place bet and cash out in the browser.
- Open two browser contexts and verify round synchronization.

## Acceptance Criteria

- `bun run test` works in both backend services.
- `bun run test:e2e` works with Docker stack.
- Frontend tests run from `frontend`.
- Browser E2E is added once frontend and auth are stable.
