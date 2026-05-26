# Spec - Bonus Differentiators

## Goal

Plan README bonus items intentionally so the implementation shows product and architecture maturity, without sacrificing eliminatory requirements.

## Tier 1 - Build Into Core Design

These should be implemented as part of the main architecture:

- Outbox/Inbox transactional processing for Game and Wallet message safety.
- Deterministic seed mode for E2E and repeatable crash scenarios.
- Auto cashout target on bets.
- Formula display in UI for multiplier transparency.
- Rate limiting for player actions.

## Tier 2 - Implement After Core Gameplay Works

- Playwright browser E2E with Keycloak login and multi-tab sync.
- Basic observability with structured logs, health/readiness, and simple metrics endpoints.
- Leaderboard for top player profit in 24h/week windows.
- CI pipeline running backend and frontend tests.

## Tier 3 - Polish If Time Allows

- Sound effects with user-controlled mute toggle.
- Storybook for reusable UI components.
- Expanded Grafana/Prometheus/OpenTelemetry stack.
- Auto bet strategies such as fixed value or Martingale with stop-loss.

## Acceptance Criteria

- Bonus work is visible in README final delivery.
- Bonus work has tests when it changes business behavior.
- Bonus work does not bypass money, auth, or idempotency rules.
