# Spec - Frontend

## Goal

Build the playable client for authenticated users and spectators.

## Stack

- TanStack Start, preferred by the challenge.
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui for reusable accessible primitives
- TanStack Query for server state
- Zustand for local game/UI state
- OIDC client for Keycloak

Fallback:

- Use Vite only if TanStack Start introduces delivery risk that would threaten eliminatory requirements.

## Main Screen

Required sections:

- Player header with username, balance, login/logout.
- Crash graph with live multiplier, curve, crash state, and pre-round seed hash.
- Visible multiplier curve formula for transparency.
- Betting controls with amount input, bet button, cashout button, and potential payout.
- Auto cashout target control.
- Current round bets list with username, amount, and status.
- Round history with latest crash points.
- Leaderboard by profit for 24h/week when backend endpoint is available.
- Toasts for errors and success feedback.

## Interaction Rules

- Bet button enabled only during betting phase and when authenticated.
- Cashout enabled only during running phase when user has an accepted active bet.
- Amount input validates min and max before calling API.
- REST errors are shown as toasts.
- WebSocket updates should not replace REST mutation confirmation handling.

## Responsive Design

- Desktop: graph and betting panel prominent, history and bets visible.
- Mobile: graph first, controls next, then lists.
- Dark casino visual style with restrained neon accents.
- Optional audio toggle for bet, cashout, round start, and crash feedback.

## Acceptance Criteria

- User can log in through Keycloak.
- User can create/read wallet.
- User can place bet and cash out.
- Round updates animate without layout jumps.
- Frontend is included in Docker Compose.
- UI uses shadcn/ui components where they fit.
