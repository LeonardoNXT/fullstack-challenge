import type { PublicRound, Wallet } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getCurrentRound(): Promise<PublicRound> {
  return request<PublicRound>("/games/rounds/current");
}

export async function getRoundHistory(): Promise<readonly PublicRound[]> {
  return request<readonly PublicRound[]>("/games/rounds/history?limit=20");
}

export async function getOrCreateWallet(token: string): Promise<Wallet> {
  try {
    return await request<Wallet>("/wallets/me", { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const created = await request<{ wallet: Wallet }>("/wallets", {
        token,
        method: "POST",
      });
      return created.wallet;
    }

    throw error;
  }
}

export async function placeBet(token: string, amountCents: number): Promise<void> {
  await request("/games/bet", {
    token,
    method: "POST",
    body: { amountCents },
  });
}

export async function cashOut(token: string): Promise<void> {
  await request("/games/bet/cashout", {
    token,
    method: "POST",
  });
}

async function request<TResponse>(
  path: string,
  options: {
    readonly token?: string;
    readonly method?: string;
    readonly body?: unknown;
  } = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token === undefined
        ? {}
        : { authorization: `Bearer ${options.token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as TResponse;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown; code?: unknown };
    if (typeof payload.message === "string") {
      return payload.message;
    }
    if (typeof payload.code === "string") {
      return payload.code;
    }
  } catch {
    // Response body is optional for gateway and network-level errors.
  }

  return `Request failed with status ${response.status}`;
}
