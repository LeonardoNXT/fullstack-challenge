import type { DomainMessage } from "./base";
import type { Cents } from "../primitives/money";
import type { BetId, PlayerId, RoundId } from "../primitives/ids";

export const WALLET_EXCHANGE = "crash.wallet.v1";

export const WALLET_ROUTING_KEYS = {
  betDebitRequested: "wallet.bet.debit.requested",
  betDebited: "wallet.bet.debited",
  betDebitRejected: "wallet.bet.debit.rejected",
  cashoutCreditRequested: "wallet.cashout.credit.requested",
  cashoutCredited: "wallet.cashout.credited",
  cashoutCreditRejected: "wallet.cashout.credit.rejected",
  betRefundRequested: "wallet.bet.refund.requested",
  betRefunded: "wallet.bet.refunded",
} as const;

export type WalletRoutingKey =
  (typeof WALLET_ROUTING_KEYS)[keyof typeof WALLET_ROUTING_KEYS];

export interface WalletBetPayload {
  readonly playerId: PlayerId;
  readonly roundId: RoundId;
  readonly betId: BetId;
  readonly amountCents: Cents;
}

export interface WalletCashoutPayload extends WalletBetPayload {
  readonly payoutCents: Cents;
  readonly multiplierBps: number;
}

export interface WalletRejectionPayload extends WalletBetPayload {
  readonly reason: "INSUFFICIENT_BALANCE" | "WALLET_NOT_FOUND" | "DUPLICATE_OPERATION" | "UNKNOWN";
}

export type WalletBetDebitRequested = DomainMessage<
  typeof WALLET_ROUTING_KEYS.betDebitRequested,
  WalletBetPayload
>;

export type WalletBetDebited = DomainMessage<
  typeof WALLET_ROUTING_KEYS.betDebited,
  WalletBetPayload
>;

export type WalletBetDebitRejected = DomainMessage<
  typeof WALLET_ROUTING_KEYS.betDebitRejected,
  WalletRejectionPayload
>;

export type WalletCashoutCreditRequested = DomainMessage<
  typeof WALLET_ROUTING_KEYS.cashoutCreditRequested,
  WalletCashoutPayload
>;

export type WalletCashoutCredited = DomainMessage<
  typeof WALLET_ROUTING_KEYS.cashoutCredited,
  WalletCashoutPayload
>;

export type WalletCashoutCreditRejected = DomainMessage<
  typeof WALLET_ROUTING_KEYS.cashoutCreditRejected,
  WalletRejectionPayload
>;

export type WalletBetRefundRequested = DomainMessage<
  typeof WALLET_ROUTING_KEYS.betRefundRequested,
  WalletBetPayload
>;

export type WalletBetRefunded = DomainMessage<
  typeof WALLET_ROUTING_KEYS.betRefunded,
  WalletBetPayload
>;

export type WalletCommand =
  | WalletBetDebitRequested
  | WalletCashoutCreditRequested
  | WalletBetRefundRequested;

export type WalletEvent =
  | WalletBetDebited
  | WalletBetDebitRejected
  | WalletCashoutCredited
  | WalletCashoutCreditRejected
  | WalletBetRefunded;
