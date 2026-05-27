import { describe, expect, test } from "bun:test";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";

interface PublicBet {
  readonly betId: string;
  readonly playerId: string;
  readonly status: string;
}

interface PublicRound {
  readonly roundId: string;
  readonly phase: string;
  readonly currentMultiplierBps: number;
  readonly bets: readonly PublicBet[];
}

describe("Gameplay API e2e", () => {
  test("places a bet, gets Wallet debit confirmation, and cashes out through Kong", async () => {
    const token = await getPlayerToken();
    const playerId = getTokenSubject(token);
    await ensureWallet(token);
    const walletBefore = await getWallet(token);
    const bettingRound = await waitForPhase("betting", 35_000);

    const betResponse = await fetch(`${API_BASE_URL}/games/bet`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amountCents: 100 }),
    });
    expect(betResponse.status).toBe(201);

    const acceptedRound = await waitForPlayerBetStatus(
      bettingRound.roundId,
      playerId,
      "accepted",
      10_000,
    );
    expect(acceptedRound.bets.some((bet) => bet.status === "accepted")).toBe(true);

    const walletAfterDebit = await getWallet(token);
    expect(walletAfterDebit.balanceCents).toBe(walletBefore.balanceCents - 100);

    await waitForPhase("running", 20_000);
    const cashout = await fetch(`${API_BASE_URL}/games/bet/cashout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect([201, 409]).toContain(cashout.status);
  });

  test("rejects duplicate bet and bet outside betting phase through HTTP", async () => {
    const token = await getPlayerToken();
    await ensureWallet(token);
    await waitForPhase("betting", 35_000);

    const first = await fetch(`${API_BASE_URL}/games/bet`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amountCents: 100 }),
    });
    expect(first.status).toBe(201);

    const duplicate = await fetch(`${API_BASE_URL}/games/bet`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amountCents: 100 }),
    });
    expect(duplicate.status).toBe(409);

    await waitForPhase("running", 20_000);
    const outsideBetting = await fetch(`${API_BASE_URL}/games/bet`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amountCents: 100 }),
    });
    expect(outsideBetting.status).toBe(409);
  });

  test("exposes provably fair verification for a settled round", async () => {
    const history = await waitForHistory(45_000);
    const response = await fetch(
      `${API_BASE_URL}/games/rounds/${history[0].roundId}/verify`,
    );
    expect(response.status).toBe(200);
    const verification = (await response.json()) as {
      serverSeed: string;
      serverSeedHash: string;
      crashPointBps: number;
      validSeedHash: boolean;
    };

    expect(verification.serverSeed.length).toBeGreaterThan(0);
    expect(verification.serverSeedHash.length).toBeGreaterThan(0);
    expect(verification.crashPointBps).toBeGreaterThanOrEqual(10000);
    expect(verification.validSeedHash).toBe(true);
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

async function ensureWallet(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/wallets`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

async function getWallet(token: string): Promise<{ balanceCents: number }> {
  const response = await fetch(`${API_BASE_URL}/wallets/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { balanceCents: number };
}

async function getCurrentRound(): Promise<PublicRound> {
  const response = await fetch(`${API_BASE_URL}/games/rounds/current`);
  expect(response.status).toBe(200);
  return (await response.json()) as PublicRound;
}

async function waitForPhase(phase: string, timeoutMs: number): Promise<PublicRound> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const round = await getCurrentRound();
    if (round.phase === phase) {
      return round;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for phase ${phase}`);
}

async function waitForPlayerBetStatus(
  roundId: string,
  playerId: string,
  status: string,
  timeoutMs: number,
): Promise<PublicRound> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const round = await getCurrentRound();
    if (
      round.roundId === roundId &&
      round.bets.some((bet) => bet.playerId === playerId && bet.status === status)
    ) {
      return round;
    }
    await sleep(250);
  }

  throw new Error(`Timed out waiting for player bet status ${status}`);
}

async function waitForHistory(timeoutMs: number): Promise<readonly PublicRound[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${API_BASE_URL}/games/rounds/history?limit=1`);
    expect(response.status).toBe(200);
    const history = (await response.json()) as readonly PublicRound[];
    if (history.length > 0) {
      return history;
    }
    await sleep(1000);
  }

  throw new Error("Timed out waiting for settled round history");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
