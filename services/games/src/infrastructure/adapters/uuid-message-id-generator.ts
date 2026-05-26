import { randomUUID } from "node:crypto";
import {
  asCorrelationId,
  asEventId,
  type CorrelationId,
  type EventId,
} from "@crash/contracts";
import type { MessageIdGenerator } from "../../application";

export class UuidMessageIdGenerator implements MessageIdGenerator {
  nextEventId(): EventId {
    return asEventId(randomUUID());
  }

  nextCorrelationId(): CorrelationId {
    return asCorrelationId(randomUUID());
  }
}
