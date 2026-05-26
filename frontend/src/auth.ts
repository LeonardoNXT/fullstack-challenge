import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

export const userManager = new UserManager({
  authority:
    import.meta.env.VITE_KEYCLOAK_AUTHORITY ??
    "http://localhost:8080/realms/crash-game",
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "crash-game-client",
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});

export async function loadUserFromRedirect(): Promise<User | null> {
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    const user = await userManager.signinRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
    return user;
  }

  return userManager.getUser();
}
