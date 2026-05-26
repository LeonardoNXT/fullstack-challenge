import type { BetSnapshot } from "../../domain";
import type { PublicRound } from "@crash/contracts";

export type RealtimeEvent =
  | RoundBettingOpenedEvent
  | RoundStartedEvent
  | RoundTickEvent
  | RoundCrashedEvent
  | BetPlacedEvent
  | BetAcceptedEvent
  | BetRejectedEvent
  | BetCashedOutEvent;

export interface RoundBettingOpenedEvent {
  readonly type: "round:betting-opened";
  readonly payload: PublicRound;
}

export interface RoundStartedEvent {
  readonly type: "round:started";
  readonly payload: PublicRound;
}

export interface RoundTickEvent {
  readonly type: "round:tick";
  readonly payload: {
    readonly roundId: PublicRound["roundId"];
    readonly serverTime: string;
    readonly startedAt?: string;
    readonly multiplierBps: PublicRound["currentMultiplierBps"];
  };
}

export interface RoundCrashedEvent {
  readonly type: "round:crashed";
  readonly payload: PublicRound;
}

export interface BetPlacedEvent {
  readonly type: "bet:placed";
  readonly payload: BetSnapshot;
}

export interface BetAcceptedEvent {
  readonly type: "bet:accepted";
  readonly payload: BetSnapshot;
}

export interface BetRejectedEvent {
  readonly type: "bet:rejected";
  readonly payload: BetSnapshot;
}

export interface BetCashedOutEvent {
  readonly type: "bet:cashed-out";
  readonly payload: BetSnapshot;
}
