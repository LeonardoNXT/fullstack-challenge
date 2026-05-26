import { describe, expect, test } from "bun:test";
import {
  asPlayerId,
  makeCents,
  makeMultiplierBps,
} from "@crash/contracts";
import { Bet, GameDomainError } from "../../src/domain";

const baseInput = {
  betId: "bet-1" as never,
  roundId: "round-1" as never,
  playerId: asPlayerId("player-1"),
  username: "player",
  amountCents: makeCents(1000),
  placedAt: new Date("2026-05-26T00:00:00.000Z"),
};

describe("Bet domain", () => {
  test("places a pending bet with valid amount", () => {
    const bet = Bet.place(baseInput);

    expect(bet.status).toBe("pending");
    expect(bet.toSnapshot().amountCents).toBe(1000);
  });

  test("rejects invalid bet amount", () => {
    expect(() => Bet.place({ ...baseInput, amountCents: makeCents(99) })).toThrow(
      new GameDomainError("INVALID_BET_AMOUNT"),
    );
  });

  test("accepts and cashes out using integer payout math", () => {
    const bet = Bet.place(baseInput);
    bet.accept();

    const payoutCents = bet.cashOut(
      makeMultiplierBps(15000),
      new Date("2026-05-26T00:00:01.000Z"),
    );

    expect(payoutCents).toBe(1500);
    expect(bet.status).toBe("cashed_out");
    expect(bet.payoutCents).toBe(1500);
  });

  test("rejects cashout before wallet debit acceptance", () => {
    const bet = Bet.place(baseInput);

    expect(() =>
      bet.cashOut(makeMultiplierBps(15000), new Date("2026-05-26T00:00:01.000Z")),
    ).toThrow(new GameDomainError("BET_NOT_ACCEPTED"));
  });

  test("marks accepted bet as lost on crash", () => {
    const bet = Bet.place(baseInput);
    bet.accept();

    bet.lose(new Date("2026-05-26T00:00:02.000Z"));

    expect(bet.status).toBe("lost");
  });
});
