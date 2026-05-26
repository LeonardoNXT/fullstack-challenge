import type { EventId } from "@crash/contracts";

export interface MessageIdGenerator {
  nextEventId(): EventId;
}
