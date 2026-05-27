import { describe, expect, test } from "bun:test";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";

describe("Wallet API e2e", () => {
  test("creates and reads the seeded Keycloak player wallet through Kong", async () => {
    const token = await getPlayerToken();
    const playerId = getTokenSubject(token);

    const create = await fetch(`${API_BASE_URL}/wallets`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect([200, 201]).toContain(create.status);

    const read = await fetch(`${API_BASE_URL}/wallets/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(read.status).toBe(200);
    const wallet = (await read.json()) as { playerId: string; balanceCents: number };

    expect(wallet.playerId).toBe(playerId);
    expect(Number.isSafeInteger(wallet.balanceCents)).toBe(true);
    expect(wallet.balanceCents).toBeGreaterThanOrEqual(0);
  });

  test("rejects missing auth on wallet read", async () => {
    const response = await fetch(`${API_BASE_URL}/wallets/me`);
    expect(response.status).toBe(401);
  });
});

async function getPlayerToken(): Promise<string> {
  const form = new URLSearchParams({
    grant_type: "password",
    client_id: "crash-game-client",
    username: "player",
    password: "player123",
  });
  const response = await fetch(
    `${KEYCLOAK_URL}/realms/crash-game/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );

  if (!response.ok) {
    throw new Error(`Token request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (payload.access_token === undefined) {
    throw new Error("Token response did not include access_token");
  }

  return payload.access_token;
}

function getTokenSubject(token: string): string {
  const [, payload] = token.split(".");
  if (payload === undefined) {
    throw new Error("Invalid JWT");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    sub?: string;
  };
  if (decoded.sub === undefined) {
    throw new Error("JWT does not include sub");
  }

  return decoded.sub;
}
