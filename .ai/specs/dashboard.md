# Spec - Dashboard / Game Page

## Goal

The dashboard is the main game page. It should be useful immediately after login and also work for unauthenticated spectators where public data is available.

## Data Needed

- Current round state.
- Current multiplier.
- Current round bets.
- Last 20 rounds.
- Authenticated player wallet.
- Authenticated player current bet.

## States

- Loading app/auth state.
- Unauthenticated spectator.
- Authenticated with no wallet.
- Authenticated with wallet.
- Betting phase.
- Running phase.
- Crashed/settled phase.
- Network error/reconnect.

## Actions

- Login.
- Logout.
- Create wallet.
- Place bet.
- Cash out.
- Refresh current state.

## Acceptance Criteria

- UI always shows current round phase.
- UI prevents impossible local actions before sending requests.
- Server errors are still handled because frontend validation is not trusted.
- Reconnect recovers from stale WebSocket state.
