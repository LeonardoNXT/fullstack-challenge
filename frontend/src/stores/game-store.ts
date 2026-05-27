import { create } from "zustand";
import type { PublicBet, PublicRound, RoundTick } from "@/types/game";

interface GameState {
  readonly liveRound: PublicRound | null;
  readonly lastTick: RoundTick | null;
  readonly lastEventAt: number | null;
  setRound(round: PublicRound | null): void;
  applyTick(tick: RoundTick): void;
  upsertBet(bet: PublicBet): void;
}

export const useGameStore = create<GameState>((set) => ({
  liveRound: null,
  lastTick: null,
  lastEventAt: null,
  setRound: (liveRound) => set({ liveRound, lastEventAt: Date.now() }),
  applyTick: (tick) =>
    set((state) => {
      if (state.liveRound === null || state.liveRound.roundId !== tick.roundId) {
        return { lastTick: tick, lastEventAt: Date.now() };
      }

      return {
        lastTick: tick,
        lastEventAt: Date.now(),
        liveRound: {
          ...state.liveRound,
          serverTime: tick.serverTime,
          startedAt: tick.startedAt ?? state.liveRound.startedAt,
          currentMultiplierBps: tick.multiplierBps,
        },
      };
    }),
  upsertBet: (bet) =>
    set((state) => {
      if (state.liveRound === null || state.liveRound.roundId !== bet.roundId) {
        return { lastEventAt: Date.now() };
      }

      const exists = state.liveRound.bets.some((candidate) => candidate.betId === bet.betId);
      const bets = exists
        ? state.liveRound.bets.map((candidate) =>
            candidate.betId === bet.betId ? bet : candidate,
          )
        : [...state.liveRound.bets, bet];

      return {
        lastEventAt: Date.now(),
        liveRound: {
          ...state.liveRound,
          bets,
        },
      };
    }),
}));
