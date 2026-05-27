import type { PublicBet, PublicRound, Wallet } from "@/types/game";

export const MIN_BET_CENTS = 100;
export const MAX_BET_CENTS = 100000;

export function parseBetAmountToCents(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }

  return Math.round(Number(normalized) * 100);
}

export function getPlayerBet(
  round: PublicRound | null | undefined,
  playerId: string | undefined,
): PublicBet | null {
  if (round === null || round === undefined || playerId === undefined) {
    return null;
  }

  return round.bets.find((bet) => bet.playerId === playerId) ?? null;
}

export function canPlaceBet(input: {
  readonly round: PublicRound | null | undefined;
  readonly playerBet: PublicBet | null;
  readonly wallet: Wallet | undefined;
  readonly amountCents: number;
}): boolean {
  return (
    input.round?.phase === "betting" &&
    input.playerBet === null &&
    Number.isSafeInteger(input.amountCents) &&
    input.amountCents >= MIN_BET_CENTS &&
    input.amountCents <= MAX_BET_CENTS &&
    (input.wallet?.balanceCents ?? 0) >= input.amountCents
  );
}

export function canCashOut(input: {
  readonly round: PublicRound | null | undefined;
  readonly playerBet: PublicBet | null;
}): boolean {
  return input.round?.phase === "running" && input.playerBet?.status === "accepted";
}

export function projectedPayoutCents(
  amountCents: number,
  multiplierBps: number,
): number {
  return Math.floor((amountCents * multiplierBps) / 10000);
}
