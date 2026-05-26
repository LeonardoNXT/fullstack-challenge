import type { WalletEvent } from "@crash/contracts";

export interface WalletEventPublisher {
  publish(event: WalletEvent): Promise<void> | void;
}
