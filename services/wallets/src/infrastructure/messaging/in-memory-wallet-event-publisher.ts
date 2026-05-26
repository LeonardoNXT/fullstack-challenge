import type { WalletEvent } from "@crash/contracts";
import type { WalletEventPublisher } from "../../application";

export class InMemoryWalletEventPublisher implements WalletEventPublisher {
  private readonly events: WalletEvent[] = [];

  publish(event: WalletEvent): void {
    this.events.push(event);
  }

  get publishedEvents(): readonly WalletEvent[] {
    return [...this.events];
  }
}
