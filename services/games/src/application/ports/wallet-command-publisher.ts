import type { WalletCommand } from "@crash/contracts";

export interface WalletCommandPublisher {
  publish(command: WalletCommand): Promise<void> | void;
}
