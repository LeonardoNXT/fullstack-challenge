import { apiRequest } from "./http";
import type {
  FairVerification,
  LeaderboardEntry,
  PublicBet,
  PublicRound,
  Wallet,
} from "@/types/game";

export const queryKeys = {
  round: ["games", "round", "current"] as const,
  history: ["games", "rounds", "history"] as const,
  wallet: ["wallets", "me"] as const,
  myBets: ["games", "bets", "me"] as const,
  leaderboard: (window: "24h" | "week") =>
    ["games", "leaderboard", window] as const,
  verify: (roundId: string) => ["games", "rounds", roundId, "verify"] as const,
};

export function getCurrentRound(): Promise<PublicRound> {
  return apiRequest<PublicRound>("/games/rounds/current");
}

export function getRoundHistory(limit = 20): Promise<readonly PublicRound[]> {
  return apiRequest<readonly PublicRound[]>(`/games/rounds/history?limit=${limit}`);
}

export function getLeaderboard(
  window: "24h" | "week",
  limit = 10,
): Promise<readonly LeaderboardEntry[]> {
  return apiRequest<readonly LeaderboardEntry[]>(
    `/games/leaderboard?window=${window}&limit=${limit}`,
  );
}

export function verifyRound(roundId: string): Promise<FairVerification> {
  return apiRequest<FairVerification>(`/games/rounds/${roundId}/verify`);
}

export function getMyBets(
  token: string,
  limit = 50,
): Promise<readonly PublicBet[]> {
  return apiRequest<readonly PublicBet[]>(`/games/bets/me?limit=${limit}`, { token });
}

export function placeBet(
  token: string,
  amountCents: number,
  autoCashoutMultiplierBps?: number,
): Promise<PublicBet> {
  return apiRequest<PublicBet>("/games/bet", {
    token,
    method: "POST",
    body: {
      amountCents,
      ...(autoCashoutMultiplierBps === undefined ? {} : { autoCashoutMultiplierBps }),
    },
  });
}

export function cashOut(token: string): Promise<{ readonly bet: PublicBet }> {
  return apiRequest<{ readonly bet: PublicBet }>("/games/bet/cashout", {
    token,
    method: "POST",
  });
}

export async function getOrCreateWallet(token: string): Promise<Wallet> {
  try {
    return await apiRequest<Wallet>("/wallets/me", { token });
  } catch (error) {
    const created = await apiRequest<{ readonly wallet: Wallet }>("/wallets", {
      token,
      method: "POST",
    });
    return created.wallet;
  }
}
