import {
  WALLET_ROUTING_KEYS,
  type EventId,
  type WalletBetDebitRejected,
  type WalletBetDebited,
  type WalletBetPayload,
  type WalletBetRefunded,
  type WalletCashoutCreditRejected,
  type WalletCashoutCredited,
  type WalletCashoutPayload,
  type WalletCommand,
  type WalletEvent,
  type WalletRejectionPayload,
} from "@crash/contracts";

export type WalletRejectionReason =
  | "INSUFFICIENT_BALANCE"
  | "WALLET_NOT_FOUND"
  | "DUPLICATE_OPERATION"
  | "UNKNOWN";

export class WalletEventFactory {
  success(command: WalletCommand, eventId: EventId, occurredAt: Date): WalletEvent {
    if (command.type === WALLET_ROUTING_KEYS.betDebitRequested) {
      return this.betDebited(command.payload, command.correlationId, eventId, occurredAt);
    }

    if (command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested) {
      return this.cashoutCredited(
        command.payload,
        command.correlationId,
        eventId,
        occurredAt,
      );
    }

    return {
      eventId,
      correlationId: command.correlationId,
      type: WALLET_ROUTING_KEYS.betRefunded,
      version: 1,
      occurredAt: occurredAt.toISOString(),
      payload: command.payload,
    } satisfies WalletBetRefunded;
  }

  rejected(
    command: WalletCommand,
    reason: WalletRejectionReason,
    eventId: EventId,
    occurredAt: Date,
  ): WalletBetDebitRejected | WalletCashoutCreditRejected {
    const payload: WalletRejectionPayload = {
      playerId: command.payload.playerId,
      roundId: command.payload.roundId,
      betId: command.payload.betId,
      amountCents: command.payload.amountCents,
      reason,
    };

    if (command.type === WALLET_ROUTING_KEYS.cashoutCreditRequested) {
      return {
        eventId,
        correlationId: command.correlationId,
        type: WALLET_ROUTING_KEYS.cashoutCreditRejected,
        version: 1,
        occurredAt: occurredAt.toISOString(),
        payload,
      };
    }

    return {
      eventId,
      correlationId: command.correlationId,
      type: WALLET_ROUTING_KEYS.betDebitRejected,
      version: 1,
      occurredAt: occurredAt.toISOString(),
      payload,
    };
  }

  private betDebited(
    payload: WalletBetPayload,
    correlationId: WalletCommand["correlationId"],
    eventId: EventId,
    occurredAt: Date,
  ): WalletBetDebited {
    return {
      eventId,
      correlationId,
      type: WALLET_ROUTING_KEYS.betDebited,
      version: 1,
      occurredAt: occurredAt.toISOString(),
      payload,
    };
  }

  private cashoutCredited(
    payload: WalletCashoutPayload,
    correlationId: WalletCommand["correlationId"],
    eventId: EventId,
    occurredAt: Date,
  ): WalletCashoutCredited {
    return {
      eventId,
      correlationId,
      type: WALLET_ROUTING_KEYS.cashoutCredited,
      version: 1,
      occurredAt: occurredAt.toISOString(),
      payload,
    };
  }
}
