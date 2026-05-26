import { describe, expect, test } from "bun:test";
import { WALLET_EXCHANGE, WALLET_ROUTING_KEYS } from "../src";

describe("wallet event contracts", () => {
  test("uses a versioned exchange and stable routing keys", () => {
    expect(WALLET_EXCHANGE).toBe("crash.wallet.v1");
    expect(WALLET_ROUTING_KEYS.betDebitRequested).toBe("wallet.bet.debit.requested");
    expect(WALLET_ROUTING_KEYS.cashoutCreditRequested).toBe(
      "wallet.cashout.credit.requested",
    );
    expect(WALLET_ROUTING_KEYS.betRefundRequested).toBe("wallet.bet.refund.requested");
  });
});
