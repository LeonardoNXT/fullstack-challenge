# Spec - Realtime

## Goal

Keep all connected clients synchronized with the server round state.

## Transport

Use NestJS WebSockets with Socket.IO or `ws`. Socket.IO is preferred for faster client integration.

## Event Model

Server emits:

- `round:betting-opened`
- `round:started`
- `round:tick`
- `round:crashed`
- `bet:placed`
- `bet:accepted`
- `bet:rejected`
- `bet:cashed-out`
- `wallet:updated`

## Tick Payload

`round:tick` should include:

- `roundId`
- `serverTime`
- `startedAt`
- `multiplierBps`

The frontend may animate between ticks, but server time remains authoritative.

## Reconnect Strategy

On connect or reconnect:

1. Fetch `GET /games/rounds/current`.
2. Fetch `GET /wallets/me` if authenticated.
3. Resume display using server timestamps.

## Acceptance Criteria

- Two browser tabs show the same round state.
- Missing a tick does not corrupt local state.
- Crash event overrides any local animation.
