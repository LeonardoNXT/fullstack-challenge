import type { WalletCommand } from "@crash/contracts";
import type { WalletCommandPublisher } from "../../application";

export class InMemoryWalletCommandPublisher implements WalletCommandPublisher {
  private readonly commands: WalletCommand[] = [];

  publish(command: WalletCommand): void {
    this.commands.push(command);
  }

  get publishedCommands(): readonly WalletCommand[] {
    return [...this.commands];
  }
}
