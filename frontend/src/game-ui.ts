import type { PublicBet, PublicRound } from "./types";

export const MIN_BET_CENTS = 100;
export const MAX_BET_CENTS = 100000;

export function validateBetAmount(amountCents: number): string | null {
  if (!Number.isSafeInteger(amountCents)) {
    return "Enter an amount in cents.";
  }

  if (amountCents < MIN_BET_CENTS) {
    return "Minimum bet is 100 cents.";
  }

  if (amountCents > MAX_BET_CENTS) {
    return "Maximum bet is 100000 cents.";
  }

  return null;
}

export function getPlayerBet(round: PublicRound | undefined, playerId: string | undefined) {
  if (round === undefined || playerId === undefined) {
    return undefined;
  }

  return round.bets.find((bet) => bet.playerId === playerId);
}

export function canPlaceBet(round: PublicRound | undefined, playerBet: PublicBet | undefined) {
  return round?.phase === "betting" && playerBet === undefined;
}

export function canCashOut(round: PublicRound | undefined, playerBet: PublicBet | undefined) {
  return round?.phase === "running" && playerBet?.status === "accepted";
}
