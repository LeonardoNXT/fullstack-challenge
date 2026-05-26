import type { Cents } from "../primitives/money";
import type { BetId, PlayerId, RoundId } from "../primitives/ids";
import type { MultiplierBps } from "../primitives/multiplier";

export type RoundPhase = "betting" | "running" | "crashed" | "settled";
export type BetStatus = "pending" | "accepted" | "rejected" | "cashed_out" | "lost";

export interface PublicBet {
  readonly betId: BetId;
  readonly roundId: RoundId;
  readonly playerId: PlayerId;
  readonly username: string;
  readonly amountCents: Cents;
  readonly status: BetStatus;
  readonly cashoutMultiplierBps?: MultiplierBps;
  readonly payoutCents?: Cents;
}

export interface PublicRound {
  readonly roundId: RoundId;
  readonly phase: RoundPhase;
  readonly serverTime: string;
  readonly bettingOpenedAt: string;
  readonly bettingClosesAt: string;
  readonly startedAt?: string;
  readonly crashedAt?: string;
  readonly currentMultiplierBps: MultiplierBps;
  readonly crashPointBps?: MultiplierBps;
  readonly serverSeedHash: string;
  readonly bets: readonly PublicBet[];
}
