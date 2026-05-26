# Skill - State Management

## Server State

Use TanStack Query for:

- Current round snapshot.
- Round history.
- Wallet.
- Player bet history.

## Local State

Use Zustand for:

- WebSocket connection status.
- Last received tick.
- User UI preferences such as sound enabled.
- Optimistic UI state only when it can be safely rolled back.

## Rules

- REST snapshot wins over stale local state.
- Crash event wins over local multiplier animation.
- Mutations invalidate or update relevant queries.
