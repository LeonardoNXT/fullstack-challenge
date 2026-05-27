import { Injectable } from "@nestjs/common";
import {
  WALLET_ROUTING_KEYS,
  asOperationId,
  type WalletCommand,
  type WalletEvent,
} from "@crash/contracts";
import { WalletDomainError } from "../../domain";
import { WalletApplicationError } from "../../application";
import type { MessageIdGenerator } from "../../application/ports/message-id-generator";
import { WalletEventFactory } from "../../application/services/wallet-event-factory";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaWalletCommandHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventFactory: WalletEventFactory,
    private readonly messageIdGenerator: MessageIdGenerator,
  ) {}

  async execute(command: WalletCommand): Promise<WalletEvent> {
    return this.prisma.$transaction(async (tx) => {
      const alreadyProcessed = await tx.processedWalletCommand.findUnique({
        where: { eventId: command.eventId },
      });
      if (alreadyProcessed !== null) {
        return alreadyProcessed.resultEvent as unknown as WalletEvent;
      }

      const occurredAt = new Date(command.occurredAt);
      const eventId = this.messageIdGenerator.nextEventId();
      const event = await this.applyCommand(command, eventId, occurredAt, tx);

      await tx.processedWalletCommand.create({
        data: {
          eventId: command.eventId,
          eventType: command.type,
          payload: command as never,
          resultEvent: event as never,
        },
      });
      await tx.outboxMessage.create({
        data: {
          id: event.eventId,
          type: event.type,
          payload: event as never,
        },
      });

      return event;
    });
  }

  private async applyCommand(
    command: WalletCommand,
    eventId: WalletEvent["eventId"],
    occurredAt: Date,
    tx: Pick<PrismaService, "wallet" | "ledgerEntry">,
  ): Promise<WalletEvent> {
    try {
      const amountCents =
        command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested
          ? command.payload.payoutCents
          : command.payload.amountCents;
      const operationId = asOperationId(
        command.type === WALLET_ROUTING_KEYS.betDebitRequested
          ? command.payload.betId
          : command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested
            ? `cashout:${command.payload.betId}`
            : `refund:${command.payload.betId}`,
      );

      const wallet = await tx.wallet.findUnique({
        where: { playerId: command.payload.playerId },
      });
      if (wallet === null) {
        throw new WalletApplicationError("WALLET_NOT_FOUND");
      }

      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { operationId },
      });

      if (existingLedger === null) {
        const isDebit = command.type === WALLET_ROUTING_KEYS.betDebitRequested;
        if (isDebit && wallet.balanceCents < amountCents) {
          throw new WalletDomainError("INSUFFICIENT_BALANCE");
        }

        const balanceAfterCents = isDebit
          ? wallet.balanceCents - amountCents
          : wallet.balanceCents + amountCents;
        await tx.wallet.update({
          where: { playerId: wallet.playerId },
          data: { balanceCents: balanceAfterCents },
        });
        await tx.ledgerEntry.create({
          data: {
            operationId,
            playerId: wallet.playerId,
            type: isDebit ? "debit" : "credit",
            amountCents,
            balanceAfterCents,
            occurredAt,
            reason: `${this.reasonPrefix(command)}:${command.payload.roundId}`,
          },
        });
      }

      return this.eventFactory.success(command, eventId, occurredAt);
    } catch (error) {
      return this.eventFactory.rejected(
        command,
        this.toRejectionReason(error),
        eventId,
        occurredAt,
      );
    }
  }

  private reasonPrefix(command: WalletCommand): string {
    if (command.type === WALLET_ROUTING_KEYS.betDebitRequested) {
      return "bet";
    }

    if (command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested) {
      return "cashout";
    }

    return "refund";
  }

  private toRejectionReason(error: unknown) {
    if (
      error instanceof WalletDomainError &&
      error.code === "INSUFFICIENT_BALANCE"
    ) {
      return "INSUFFICIENT_BALANCE" as const;
    }

    if (
      error instanceof WalletApplicationError &&
      error.code === "WALLET_NOT_FOUND"
    ) {
      return "WALLET_NOT_FOUND" as const;
    }

    return "UNKNOWN" as const;
  }
}
