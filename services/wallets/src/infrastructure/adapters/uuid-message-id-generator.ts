import { randomUUID } from "node:crypto";
import { asEventId, type EventId } from "@crash/contracts";
import type { MessageIdGenerator } from "../../application";

export class UuidMessageIdGenerator implements MessageIdGenerator {
  nextEventId(): EventId {
    return asEventId(randomUUID());
  }
}
