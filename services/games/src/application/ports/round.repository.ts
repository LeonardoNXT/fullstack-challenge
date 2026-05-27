import type { PlayerId, RoundId, WalletCommand, WalletEvent } from "@crash/contracts";
import type { BetSnapshot, Round } from "../../domain";

export interface WalletEventProcessingResult {
  readonly handled: boolean;
  readonly duplicate: boolean;
  readonly bet?: BetSnapshot;
}

export interface RoundRepository {
  findCurrent(): Promise<Round | null>;
  findById(roundId: RoundId): Promise<Round | null>;
  findRecentSettled(limit: number): Promise<readonly Round[]>;
  findBetsByPlayerId(playerId: PlayerId, limit: number): Promise<readonly BetSnapshot[]>;
  findAllBets(limit: number): Promise<readonly BetSnapshot[]>;
  findBetsSince(since: Date, limit: number): Promise<readonly BetSnapshot[]>;
  save(round: Round): Promise<void>;
  saveWithOutbox?(round: Round, commands: readonly WalletCommand[]): Promise<void>;
  processWalletEventWithInbox?(
    event: WalletEvent,
    now: Date,
  ): Promise<WalletEventProcessingResult>;
}
