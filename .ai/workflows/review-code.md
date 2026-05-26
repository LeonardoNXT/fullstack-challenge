# Workflow - Review Code

Review with this order:

1. Money correctness.
2. Game rule correctness.
3. Idempotency and duplicate message handling.
4. Auth boundaries.
5. Persistence consistency.
6. WebSocket recovery behavior.
7. Tests for the changed behavior.
8. Frontend accessibility and loading/error states.

## Finding Format

- Severity.
- File and line when possible.
- Why it matters.
- Suggested fix.

## Do Not Focus On

- Style-only comments unless they obscure correctness.
- Large rewrites when a smaller correction solves the risk.
