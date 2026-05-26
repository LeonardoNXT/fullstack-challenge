export type RoundPhase = "betting" | "running" | "crashed" | "settled";
export type BetStatus = "pending" | "accepted" | "rejected" | "cashed_out" | "lost";

export interface PublicBet {
  readonly betId: string;
  readonly roundId: string;
  readonly playerId: string;
  readonly username: string;
  readonly amountCents: number;
  readonly status: BetStatus;
  readonly cashoutMultiplierBps?: number;
  readonly payoutCents?: number;
}

export interface PublicRound {
  readonly roundId: string;
  readonly phase: RoundPhase;
  readonly serverTime: string;
  readonly bettingOpenedAt: string;
  readonly bettingClosesAt: string;
  readonly startedAt?: string;
  readonly crashedAt?: string;
  readonly currentMultiplierBps: number;
  readonly crashPointBps?: number;
  readonly serverSeedHash: string;
  readonly bets: readonly PublicBet[];
}

export interface Wallet {
  readonly playerId: string;
  readonly balanceCents: number;
}

export interface RoundTick {
  readonly roundId: string;
  readonly serverTime: string;
  readonly startedAt?: string;
  readonly multiplierBps: number;
}
