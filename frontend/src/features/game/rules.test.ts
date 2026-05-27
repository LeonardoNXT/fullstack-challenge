import { describe, expect, test } from "bun:test";
import {
  canCashOut,
  canPlaceBet,
  parseBetAmountToCents,
  projectedPayoutCents,
} from "./rules";
import type { PublicBet, PublicRound, Wallet } from "@/types/game";

const round: PublicRound = {
  roundId: "round-1",
  phase: "betting",
  serverTime: new Date().toISOString(),
  bettingOpenedAt: new Date().toISOString(),
  bettingClosesAt: new Date(Date.now() + 10_000).toISOString(),
  currentMultiplierBps: 10000,
  serverSeedHash: "hash",
  bets: [],
};

const wallet: Wallet = {
  playerId: "player-1",
  balanceCents: 5000,
};

const acceptedBet: PublicBet = {
  betId: "bet-1",
  roundId: "round-1",
  playerId: "player-1",
  username: "player",
  amountCents: 1000,
  status: "accepted",
};

describe("game UI rules", () => {
  test("parses decimal money to cents", () => {
    expect(parseBetAmountToCents("1")).toBe(100);
    expect(parseBetAmountToCents("10,50")).toBe(1050);
    expect(Number.isNaN(parseBetAmountToCents("10.999"))).toBe(true);
  });

  test("enables bet only during betting with valid balance and no player bet", () => {
    expect(canPlaceBet({ round, playerBet: null, wallet, amountCents: 1000 })).toBe(true);
    expect(canPlaceBet({ round, playerBet: acceptedBet, wallet, amountCents: 1000 })).toBe(false);
    expect(
      canPlaceBet({
        round: { ...round, phase: "running" },
        playerBet: null,
        wallet,
        amountCents: 1000,
      }),
    ).toBe(false);
    expect(canPlaceBet({ round, playerBet: null, wallet, amountCents: 1000000 })).toBe(false);
  });

  test("enables cashout only for accepted bet during running phase", () => {
    expect(canCashOut({ round: { ...round, phase: "running" }, playerBet: acceptedBet })).toBe(true);
    expect(canCashOut({ round, playerBet: acceptedBet })).toBe(false);
    expect(canCashOut({ round: { ...round, phase: "running" }, playerBet: null })).toBe(false);
  });

  test("projects payout with integer basis points", () => {
    expect(projectedPayoutCents(1000, 15000)).toBe(1500);
    expect(projectedPayoutCents(999, 12345)).toBe(1233);
  });
});
