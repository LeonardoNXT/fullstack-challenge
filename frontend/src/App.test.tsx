import { describe, expect, test } from "bun:test";
import { canCashOut, canPlaceBet, validateBetAmount } from "./game-ui";
import type { PublicBet, PublicRound } from "./types";

const round: PublicRound = {
  roundId: "round-1",
  phase: "betting",
  serverTime: new Date().toISOString(),
  bettingOpenedAt: new Date().toISOString(),
  bettingClosesAt: new Date().toISOString(),
  currentMultiplierBps: 10000,
  serverSeedHash: "hash",
  bets: [],
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
  test("validates bet boundaries", () => {
    expect(validateBetAmount(99)).toBe("Minimum bet is 100 cents.");
    expect(validateBetAmount(100001)).toBe("Maximum bet is 100000 cents.");
    expect(validateBetAmount(1000)).toBeNull();
  });

  test("enables bet only during betting without an existing player bet", () => {
    expect(canPlaceBet(round, undefined)).toBe(true);
    expect(canPlaceBet(round, acceptedBet)).toBe(false);
    expect(canPlaceBet({ ...round, phase: "running" }, undefined)).toBe(false);
  });

  test("enables cashout only for accepted bet during running phase", () => {
    expect(canCashOut({ ...round, phase: "running" }, acceptedBet)).toBe(true);
    expect(canCashOut(round, acceptedBet)).toBe(false);
    expect(canCashOut({ ...round, phase: "running" }, { ...acceptedBet, status: "pending" })).toBe(false);
  });
});
