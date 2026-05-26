import type { EventId } from "@crash/contracts";
import type { ProcessedWalletEventStore } from "../../application";

export class InMemoryProcessedWalletEventStore implements ProcessedWalletEventStore {
  private readonly eventIds = new Set<EventId>();

  has(eventId: EventId): boolean {
    return this.eventIds.has(eventId);
  }

  record(eventId: EventId): void {
    this.eventIds.add(eventId);
  }
}
