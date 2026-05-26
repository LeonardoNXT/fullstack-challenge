# Skill - Testing

## Backend

- Domain tests should not require database or Nest app.
- E2E tests may require Docker services.
- Use deterministic clocks/seeds for round tests.
- Test idempotency explicitly.

## Frontend

- Prefer component tests for UI state.
- Mock API and WebSocket where practical.
- Use Playwright only after core app is stable.

## What To Prioritize

1. Money safety.
2. Round state rules.
3. RabbitMQ idempotency.
4. Core player journey.
5. UI rendering states.
