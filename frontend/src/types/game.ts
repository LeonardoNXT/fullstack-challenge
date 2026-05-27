export type RoundPhase = "betting" | "running" | "crashed" | "settled";
export type BetStatus = "pending" | "accepted" | "rejected" | "cashed_out" | "lost";

export interface PublicBet {
  readonly betId: string;
  readonly roundId: string;
  readonly playerId: string;
  readonly username: string;
  readonly amountCents: number;
  readonly status: BetStatus;
  readonly autoCashoutMultiplierBps?: number;
  readonly cashoutMultiplierBps?: number;
  readonly payoutCents?: number;
  readonly placedAt?: string;
  readonly settledAt?: string;
  readonly rejectionReason?: string;
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

export interface LeaderboardEntry {
  readonly playerId: string;
  readonly username: string;
  readonly profitCents: number;
  readonly wageredCents: number;
  readonly payoutCents: number;
}

export interface FairVerification {
  readonly roundId?: string;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  readonly clientSeed: string;
  readonly nonce: number;
  readonly crashPointBps: number;
  readonly validSeedHash: boolean;
}

export type RealtimeEventName =
  | "round:betting-opened"
  | "round:started"
  | "round:tick"
  | "round:crashed"
  | "bet:placed"
  | "bet:accepted"
  | "bet:rejected"
  | "bet:cashed-out"
  | "wallet:updated";

export interface RoundTick {
  readonly roundId: string;
  readonly serverTime: string;
  readonly startedAt?: string;
  readonly multiplierBps: number;
}
