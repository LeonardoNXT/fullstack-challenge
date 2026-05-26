import type { EventId } from "@crash/contracts";

export interface ProcessedWalletEventStore {
  has(eventId: EventId): Promise<boolean> | boolean;
  record(eventId: EventId): Promise<void> | void;
}
