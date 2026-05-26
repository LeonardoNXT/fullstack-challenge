import {
  WALLET_ROUTING_KEYS,
  type CorrelationId,
  type EventId,
  type WalletBetDebitRequested,
  type WalletCashoutCreditRequested,
} from "@crash/contracts";
import type { BetSnapshot } from "../../domain";

export interface WalletMessageMetadata {
  readonly eventId: EventId;
  readonly correlationId: CorrelationId;
  readonly occurredAt: Date;
}

export class WalletCommandFactory {
  betDebitRequested(
    bet: BetSnapshot,
    metadata: WalletMessageMetadata,
  ): WalletBetDebitRequested {
    return {
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      type: WALLET_ROUTING_KEYS.betDebitRequested,
      version: 1,
      occurredAt: metadata.occurredAt.toISOString(),
      payload: {
        playerId: bet.playerId,
        roundId: bet.roundId,
        betId: bet.betId,
        amountCents: bet.amountCents,
      },
    };
  }

  cashoutCreditRequested(
    bet: BetSnapshot,
    metadata: WalletMessageMetadata,
  ): WalletCashoutCreditRequested {
    if (bet.payoutCents === undefined || bet.cashoutMultiplierBps === undefined) {
      throw new Error("BET_CASHOUT_PAYLOAD_INCOMPLETE");
    }

    return {
      eventId: metadata.eventId,
      correlationId: metadata.correlationId,
      type: WALLET_ROUTING_KEYS.cashoutCreditRequested,
      version: 1,
      occurredAt: metadata.occurredAt.toISOString(),
      payload: {
        playerId: bet.playerId,
        roundId: bet.roundId,
        betId: bet.betId,
        amountCents: bet.amountCents,
        payoutCents: bet.payoutCents,
        multiplierBps: bet.cashoutMultiplierBps,
      },
    };
  }
}
