# AI Project Memory - Crash Game

This folder is the implementation memory for the Crash Game challenge. Use it before coding, reviewing, or changing architecture so the work stays aligned with the original request.

## How To Use

1. Read `context/project-overview.md` and `context/architecture.md` before starting a new implementation session.
2. Read the relevant file in `specs/` before changing a feature.
3. Follow the technology patterns in `skills/`.
4. Use `workflows/implement-feature.md`, `workflows/fix-bug.md`, `workflows/refactor.md`, or `workflows/review-code.md` depending on the task.
5. Record major architecture choices in `decisions/`.
6. Update `outputs/reports.md` after meaningful implementation milestones.

## Current Priority

The project is still at scaffold stage. The first implementation goal is to make the local stack bootable with one command, then build the wallet, game engine, RabbitMQ integration, real-time UI, tests, and README-aligned differentiators.

## Non-Negotiables

- Do not use floating point for money.
- Keep Game and Wallet as separate bounded contexts.
- Use RabbitMQ for cross-service financial workflows.
- Make `bun run docker:up` start the full system without manual steps.
- Keep REST player actions separate from WebSocket server push events.
- Validate JWTs from Keycloak on authenticated endpoints.
- Add tests for domain rules and core gameplay flows.
- Prefer the challenge's favored stack choices: Keycloak, Kong, RabbitMQ, PostgreSQL, NestJS, Bun, TanStack, Tailwind v4, shadcn/ui, and Swagger/OpenAPI.
- Treat high-signal bonuses as planned scope unless they threaten eliminatory delivery.
