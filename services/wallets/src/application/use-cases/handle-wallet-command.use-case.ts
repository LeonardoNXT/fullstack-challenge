import {
  WALLET_ROUTING_KEYS,
  asOperationId,
  type WalletCommand,
  type WalletEvent,
} from "@crash/contracts";
import { WalletDomainError } from "../../domain";
import { WalletApplicationError } from "../errors/wallet-application.error";
import type { MessageIdGenerator } from "../ports/message-id-generator";
import type { WalletEventPublisher } from "../ports/wallet-event-publisher";
import type { WalletEventFactory, WalletRejectionReason } from "../services/wallet-event-factory";
import type { CreditWalletUseCase } from "./credit-wallet.use-case";
import type { DebitWalletUseCase } from "./debit-wallet.use-case";

export class HandleWalletCommandUseCase {
  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
    private readonly eventFactory: WalletEventFactory,
    private readonly messageIdGenerator: MessageIdGenerator,
    private readonly walletEventPublisher?: WalletEventPublisher,
  ) {}

  async execute(command: WalletCommand): Promise<WalletEvent> {
    const occurredAt = new Date(command.occurredAt);
    const eventId = this.messageIdGenerator.nextEventId();

    try {
      if (command.type === WALLET_ROUTING_KEYS.betDebitRequested) {
        await this.debitWalletUseCase.execute({
          playerId: command.payload.playerId,
          operationId: asOperationId(command.payload.betId),
          amountCents: command.payload.amountCents,
          reason: `bet:${command.payload.roundId}`,
          occurredAt,
        });
      } else if (command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested) {
        await this.creditWalletUseCase.execute({
          playerId: command.payload.playerId,
          operationId: asOperationId(`cashout:${command.payload.betId}`),
          amountCents: command.payload.payoutCents,
          reason: `cashout:${command.payload.roundId}`,
          occurredAt,
        });
      } else {
        await this.creditWalletUseCase.execute({
          playerId: command.payload.playerId,
          operationId: asOperationId(`refund:${command.payload.betId}`),
          amountCents: command.payload.amountCents,
          reason: `refund:${command.payload.roundId}`,
          occurredAt,
        });
      }

      return await this.publish(
        this.eventFactory.success(command, eventId, occurredAt),
      );
    } catch (error) {
      return await this.publish(
        this.eventFactory.rejected(
          command,
          this.toRejectionReason(error),
          eventId,
          occurredAt,
        ),
      );
    }
  }

  private async publish(event: WalletEvent): Promise<WalletEvent> {
    await this.walletEventPublisher?.publish(event);
    return event;
  }

  private toRejectionReason(error: unknown): WalletRejectionReason {
    if (
      error instanceof WalletDomainError &&
      error.code === "INSUFFICIENT_BALANCE"
    ) {
      return "INSUFFICIENT_BALANCE";
    }

    if (
      error instanceof WalletApplicationError &&
      error.code === "WALLET_NOT_FOUND"
    ) {
      return "WALLET_NOT_FOUND";
    }

    return "UNKNOWN";
  }
}
