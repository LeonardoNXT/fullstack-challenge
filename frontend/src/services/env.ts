export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? "http://localhost:8000",
  keycloakAuthority:
    import.meta.env.VITE_KEYCLOAK_AUTHORITY ??
    "http://localhost:8080/realms/crash-game",
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "crash-game-client",
  gameTitle: import.meta.env.VITE_GAME_TITLE ?? "Jungle Crash",
} as const;
