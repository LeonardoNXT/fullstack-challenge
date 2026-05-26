import type { BetId, RoundId } from "@crash/contracts";

export interface IdGenerator {
  nextRoundId(): RoundId;
  nextBetId(): BetId;
}
