# Spec - Infrastructure

## Goal

`bun run docker:up` starts the full local system without manual setup.

## Required Services

- Postgres
- RabbitMQ
- Keycloak
- Kong
- Games Service
- Wallets Service
- Frontend

## Boot Requirements

- Env values are available to services without copying files manually.
- Databases `games` and `wallets` are created automatically.
- Migrations run automatically or as part of service startup.
- Test user exists in Keycloak.
- Test wallet seed exists for player.
- Kong routes both REST and WebSocket traffic as needed.
- Kong or application layer provides rate limiting for player actions.
- Optional observability services can be added after core stack stability.

## Acceptance Criteria

- `docker compose config` succeeds.
- `bun run docker:up` starts all containers.
- Health endpoints work through Kong.
- Frontend is reachable at `http://localhost:3000`.
- Swagger/OpenAPI is reachable for both services.
