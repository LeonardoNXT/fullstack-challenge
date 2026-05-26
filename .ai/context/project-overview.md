# Project Overview

## Goal

Build a full-stack multiplayer Crash Game. Players authenticate, create a wallet, place one bet during the betting window, watch a multiplier rise in real time, and cash out before the crash point to win.

## Existing Repository Shape

- Root workspace managed by Bun.
- `services/games`: NestJS scaffold with health endpoint only.
- `services/wallets`: NestJS scaffold with health endpoint only.
- `frontend`: empty placeholder.
- `packages`: empty placeholder for shared contracts and primitives.
- `docker`: support files for Kong, Keycloak, and Postgres.
- `docker-compose.yml`: infrastructure and backend service definitions, frontend commented out.

## Current Scripts

Root:

- `bun run docker:up`
- `bun run docker:down`
- `bun run docker:prune`

Games service:

- `bun run dev`
- `bun run start`
- `bun run test`
- `bun run test:e2e`

Wallets service:

- `bun run dev`
- `bun run start`
- `bun run test`
- `bun run test:e2e`

## First Known Blocker

Original scaffold issue: `docker-compose.yml` referenced `services/games/.env` and `services/wallets/.env`, but only `.env.example` exists. The Docker path should not require copying env files manually; `.env.example` is the template for running services outside Docker.

## Success Criteria

- Local stack boots with `bun run docker:up`.
- Keycloak test user can log in.
- Player can create/read wallet and see balance.
- Player can place a valid bet only during the betting phase.
- Multiplier is synchronized across clients.
- Player can cash out before crash and wallet balance updates.
- Uncashed bets lose at crash.
- Round history and provably fair verification are available.
- Domain and E2E tests cover happy paths and validation errors.
