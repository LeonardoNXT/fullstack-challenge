import type { PublicRound } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import type { RealtimeEvent, RoundTickEvent } from "../events/realtime-events";
import type { TickRoundEngineOutput } from "../use-cases/tick-round-engine.use-case";

export class RealtimeEventFactory {
  fromTickResult(result: TickRoundEngineOutput): readonly RealtimeEvent[] {
    const events: RealtimeEvent[] = [];

    for (const bet of result.autoCashedOutBets) {
      events.push({ type: "bet:cashed-out", payload: bet });
    }

    if (result.round !== undefined) {
      if (result.actions.includes("opened")) {
        events.push({ type: "round:betting-opened", payload: result.round });
      }

      if (result.actions.includes("started")) {
        events.push({ type: "round:started", payload: result.round });
      }

      if (result.actions.includes("crashed")) {
        events.push({ type: "round:crashed", payload: result.round });
      }

      events.push(this.roundTick(result.round));
    }

    return events;
  }

  betPlaced(bet: BetSnapshot): RealtimeEvent {
    return { type: "bet:placed", payload: bet };
  }

  betAccepted(bet: BetSnapshot): RealtimeEvent {
    return { type: "bet:accepted", payload: bet };
  }

  betRejected(bet: BetSnapshot): RealtimeEvent {
    return { type: "bet:rejected", payload: bet };
  }

  betCashedOut(bet: BetSnapshot): RealtimeEvent {
    return { type: "bet:cashed-out", payload: bet };
  }

  walletUpdated(playerId: BetSnapshot["playerId"]): RealtimeEvent {
    return { type: "wallet:updated", payload: { playerId } };
  }

  private roundTick(round: PublicRound): RoundTickEvent {
    return {
      type: "round:tick",
      payload: {
        roundId: round.roundId,
        serverTime: round.serverTime,
        startedAt: round.startedAt,
        multiplierBps: round.currentMultiplierBps,
      },
    };
  }
}
