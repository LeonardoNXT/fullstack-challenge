# Spec - Authentication

## Goal

Use Keycloak as the identity provider and validate JWTs in backend services.

## Keycloak Defaults

- Realm: `crash-game`
- Client ID: `crash-game-client`
- Flow: OIDC authorization code with PKCE S256.
- Test user: `player` / `player123`.
- Discovery URL: `http://localhost:8080/realms/crash-game/.well-known/openid-configuration`

## Backend Behavior

- Authenticated endpoints require `Authorization: Bearer <access_token>`.
- Services validate signature, issuer, audience/client compatibility, and expiration.
- `playerId` is taken from JWT `sub`.
- `username` is taken from preferred username when available.
- Public endpoints never require a token.

## Frontend Behavior

- Login redirects to Keycloak.
- Callback exchanges authorization code using PKCE.
- Store token in browser state/storage appropriate for the chosen OIDC client.
- Attach bearer token to authenticated REST calls.
- On `401`, clear auth state and send user back to login.

## Acceptance Criteria

- `GET /wallets/me` rejects missing token.
- `GET /games/bets/me` rejects missing token.
- Test user can authenticate and place a bet.
- Backend logs do not print raw access tokens.
