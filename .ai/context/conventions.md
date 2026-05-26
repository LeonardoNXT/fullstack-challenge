# Conventions

## Language And Runtime

- Use TypeScript strict mode.
- Use Bun for scripts and tests.
- Keep services NestJS-based.
- Prefer ASCII in source and docs unless product copy requires otherwise.

## Money

- Store money as integer cents.
- Use names ending in `Cents`, for example `balanceCents` and `amountCents`.
- Never use JavaScript floating point for financial calculations.
- Parse user-entered decimal amounts at API/frontend boundaries only.

## Domain Modeling

- Keep domain entities free of NestJS decorators.
- Put business rules in domain/application layers, not controllers.
- Controllers should validate input, call use cases, and map output DTOs.
- Repositories belong in infrastructure.

## Error Handling

- Return clear HTTP status codes:
  - `400` for invalid input.
  - `401` for missing/invalid auth.
  - `403` for forbidden player action.
  - `404` for missing resource.
  - `409` for state conflicts such as duplicate bet.
  - `422` for valid shape but rejected business operation.
- Use stable error codes in response bodies.

## IDs And Idempotency

- Use UUIDs for entity ids and message ids.
- Every RabbitMQ message must have `eventId` and `correlationId`.
- Store processed message ids before applying side effects when possible.
- Ledger entries must have unique operation ids.

## Tests

- Unit tests target domain rules first.
- E2E tests target API and cross-service flows.
- Use deterministic seeds in tests where crash point matters.

## Git

- Prefer small commits that map to a single behavior.
- Suggested prefixes:
  - `chore:`
  - `feat(wallets):`
  - `feat(games):`
  - `feat(frontend):`
  - `test:`
  - `docs:`
