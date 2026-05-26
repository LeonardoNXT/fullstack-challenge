import type { CorrelationId, EventId } from "@crash/contracts";

export interface MessageIdGenerator {
  nextEventId(): EventId;
  nextCorrelationId(): CorrelationId;
}
