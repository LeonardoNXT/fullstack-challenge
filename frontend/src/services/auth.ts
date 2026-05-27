import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import { env } from "./env";
import type { PlayerProfile } from "@/types/auth";

let manager: UserManager | undefined;
let loadUserPromise: Promise<User | null> | undefined;

export function getUserManager(): UserManager {
  if (manager !== undefined) {
    return manager;
  }

  manager = new UserManager({
    authority: env.keycloakAuthority,
    client_id: env.keycloakClientId,
    redirect_uri: window.location.origin,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });

  return manager;
}

export async function loadOidcUser(): Promise<User | null> {
  if (loadUserPromise !== undefined) {
    return loadUserPromise;
  }

  loadUserPromise = loadOidcUserOnce();
  return loadUserPromise;
}

async function loadOidcUserOnce(): Promise<User | null> {
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    const user = await getUserManager().signinRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
    return user;
  }

  return getUserManager().getUser();
}

export function toPlayerProfile(user: User | null): PlayerProfile | null {
  if (user === null || user.expired || user.access_token.length === 0) {
    return null;
  }

  return {
    playerId: String(user.profile.sub),
    username:
      String(user.profile.preferred_username ?? user.profile.name ?? user.profile.sub),
    token: user.access_token,
  };
}
