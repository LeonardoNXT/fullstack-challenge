import { describe, expect, test } from "bun:test";
import {
  asPlayerId,
  makeCents,
  makeMultiplierBps,
} from "@crash/contracts";
import { GameDomainError, Round } from "../../src/domain";

function createRound(): Round {
  return Round.open({
    roundId: "round-1" as never,
    serverSeedHash: "hash",
    clientSeed: "client",
    nonce: 1,
    crashPointBps: makeMultiplierBps(20000),
    bettingOpenedAt: new Date("2026-05-26T00:00:00.000Z"),
    bettingClosesAt: new Date("2026-05-26T00:00:10.000Z"),
    growthBpsPerSecond: 5000,
  });
}

describe("Round domain", () => {
  test("places one bet per player during betting phase", () => {
    const round = createRound();

    const bet = round.placeBet({
      betId: "bet-1" as never,
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:01.000Z"),
    });

    expect(bet.status).toBe("pending");
    expect(round.bets).toHaveLength(1);
    expect(() =>
      round.placeBet({
        betId: "bet-2" as never,
        playerId: asPlayerId("player-1"),
        username: "player",
        amountCents: makeCents(1000),
        placedAt: new Date("2026-05-26T00:00:02.000Z"),
      }),
    ).toThrow(new GameDomainError("DUPLICATE_BET"));
  });

  test("rejects bet after round starts", () => {
    const round = createRound();
    round.start(new Date("2026-05-26T00:00:10.000Z"));

    expect(() =>
      round.placeBet({
        betId: "bet-1" as never,
        playerId: asPlayerId("player-1"),
        username: "player",
        amountCents: makeCents(1000),
        placedAt: new Date("2026-05-26T00:00:11.000Z"),
      }),
    ).toThrow(new GameDomainError("ROUND_NOT_BETTING"));
  });

  test("calculates multiplier from elapsed server time", () => {
    const round = createRound();
    round.start(new Date("2026-05-26T00:00:10.000Z"));

    expect(round.currentMultiplierAt(new Date("2026-05-26T00:00:10.000Z"))).toBe(10000);
    expect(round.currentMultiplierAt(new Date("2026-05-26T00:00:11.000Z"))).toBe(15000);
    expect(round.currentMultiplierAt(new Date("2026-05-26T00:00:12.000Z"))).toBe(20000);
  });

  test("cashes out accepted bet before crash", () => {
    const round = createRound();
    const playerId = asPlayerId("player-1");
    const bet = round.placeBet({
      betId: "bet-1" as never,
      playerId,
      username: "player",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:01.000Z"),
    });
    round.acceptBet(bet.betId);
    round.start(new Date("2026-05-26T00:00:10.000Z"));

    const result = round.cashOut(playerId, new Date("2026-05-26T00:00:11.000Z"));

    expect(result.payoutCents).toBe(1500);
    expect(result.bet.status).toBe("cashed_out");
  });

  test("rejects cashout at or after crash point", () => {
    const round = createRound();
    const playerId = asPlayerId("player-1");
    const bet = round.placeBet({
      betId: "bet-1" as never,
      playerId,
      username: "player",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:01.000Z"),
    });
    round.acceptBet(bet.betId);
    round.start(new Date("2026-05-26T00:00:10.000Z"));

    expect(() =>
      round.cashOut(playerId, new Date("2026-05-26T00:00:12.000Z")),
    ).toThrow(new GameDomainError("ROUND_ALREADY_CRASHED"));
  });

  test("auto cashes out accepted bets when target is reached", () => {
    const round = createRound();
    const bet = round.placeBet({
      betId: "bet-1" as never,
      playerId: asPlayerId("player-1"),
      username: "player",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:01.000Z"),
      autoCashoutMultiplierBps: makeMultiplierBps(15000),
    });
    round.acceptBet(bet.betId);
    round.start(new Date("2026-05-26T00:00:10.000Z"));

    const cashedOut = round.applyAutoCashouts(
      new Date("2026-05-26T00:00:11.000Z"),
    );

    expect(cashedOut).toHaveLength(1);
    expect(cashedOut[0].status).toBe("cashed_out");
    expect(cashedOut[0].payoutCents).toBe(1500);
  });

  test("crash marks accepted uncashed bets as lost and preserves cashed out bets", () => {
    const round = createRound();
    const firstBet = round.placeBet({
      betId: "bet-1" as never,
      playerId: asPlayerId("player-1"),
      username: "player 1",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:01.000Z"),
    });
    const secondBet = round.placeBet({
      betId: "bet-2" as never,
      playerId: asPlayerId("player-2"),
      username: "player 2",
      amountCents: makeCents(1000),
      placedAt: new Date("2026-05-26T00:00:02.000Z"),
    });
    round.acceptBet(firstBet.betId);
    round.acceptBet(secondBet.betId);
    round.start(new Date("2026-05-26T00:00:10.000Z"));
    round.cashOut(asPlayerId("player-1"), new Date("2026-05-26T00:00:11.000Z"));

    const lostBets = round.crash(new Date("2026-05-26T00:00:12.000Z"));

    expect(lostBets).toHaveLength(1);
    expect(firstBet.status).toBe("cashed_out");
    expect(secondBet.status).toBe("lost");
    expect(round.phase).toBe("crashed");
  });

  test("settles after crash", () => {
    const round = createRound();
    round.start(new Date("2026-05-26T00:00:10.000Z"));
    round.crash(new Date("2026-05-26T00:00:12.000Z"));

    round.settle();

    expect(round.phase).toBe("settled");
  });
});
