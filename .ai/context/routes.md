# Routes

Kong has `strip_path: true`. Public routes use `/games` and `/wallets`, but each backend controller receives paths without the service prefix.

## Wallets

Public via Kong:

- `POST /wallets`
- `GET /wallets/me`
- `GET /wallets/health`

Service-local routes:

- `POST /`
- `GET /me`
- `GET /health`

Auth:

- `POST /wallets`: required.
- `GET /wallets/me`: required.
- `GET /wallets/health`: public.

## Games

Public via Kong:

- `GET /games/rounds/current`
- `GET /games/rounds/history`
- `GET /games/rounds/:roundId/verify`
- `GET /games/bets/me`
- `POST /games/bet`
- `POST /games/bet/cashout`
- `GET /games/health`

Service-local routes:

- `GET /rounds/current`
- `GET /rounds/history`
- `GET /rounds/:roundId/verify`
- `GET /bets/me`
- `POST /bet`
- `POST /bet/cashout`
- `GET /health`

Auth:

- Public: current round, history, verify, health.
- Required: player bet history, place bet, cashout.

## WebSocket

Expose through Games Service. Prefer route/path that works both directly and through Kong.

Server-to-client events:

- `round:betting-opened`
- `round:started`
- `round:tick`
- `round:crashed`
- `bet:placed`
- `bet:accepted`
- `bet:rejected`
- `bet:cashed-out`
- `wallet:updated`

Client actions:

- Do not place bets through WebSocket.
- Do not cash out through WebSocket.
- Use REST actions only.
