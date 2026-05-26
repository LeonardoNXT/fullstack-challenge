# Skill - TypeScript

## Defaults

- Keep strict mode.
- Avoid `any`.
- Prefer explicit DTO and domain types.
- Model state with discriminated unions where useful.
- Use branded or named types for cents and basis points when practical.

## Money

- Use integer cents.
- Keep conversion helpers at API/UI boundaries.
- Never call `parseFloat` in domain code.
- Never store monetary values in floating point.

## Errors

- Prefer typed domain errors.
- Map domain errors to HTTP errors in presentation/application layer.
- Keep error codes stable for frontend handling.

## Tests

- Test pure functions and entities without NestJS when possible.
