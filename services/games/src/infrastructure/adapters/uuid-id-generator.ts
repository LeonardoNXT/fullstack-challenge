import { randomUUID } from "node:crypto";
import { asBetId, asRoundId, type BetId, type RoundId } from "@crash/contracts";
import type { IdGenerator } from "../../application";

export class UuidIdGenerator implements IdGenerator {
  nextRoundId(): RoundId {
    return asRoundId(randomUUID());
  }

  nextBetId(): BetId {
    return asBetId(randomUUID());
  }
}
