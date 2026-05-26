import type { PlayerId, RoundId } from "@crash/contracts";
import type { BetSnapshot, Round } from "../../domain";

export interface RoundRepository {
  findCurrent(): Promise<Round | null>;
  findById(roundId: RoundId): Promise<Round | null>;
  findRecentSettled(limit: number): Promise<readonly Round[]>;
  findBetsByPlayerId(playerId: PlayerId, limit: number): Promise<readonly BetSnapshot[]>;
  findAllBets(limit: number): Promise<readonly BetSnapshot[]>;
  save(round: Round): Promise<void>;
}
