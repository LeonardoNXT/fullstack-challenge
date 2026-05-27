import { create } from "zustand";

interface UiState {
  readonly fairRoundId: string | null;
  readonly leaderboardWindow: "24h" | "week";
  readonly compactMode: boolean;
  setFairRoundId(roundId: string | null): void;
  setLeaderboardWindow(window: "24h" | "week"): void;
  setCompactMode(enabled: boolean): void;
}

export const useUiStore = create<UiState>((set) => ({
  fairRoundId: null,
  leaderboardWindow: "24h",
  compactMode: false,
  setFairRoundId: (fairRoundId) => set({ fairRoundId }),
  setLeaderboardWindow: (leaderboardWindow) => set({ leaderboardWindow }),
  setCompactMode: (compactMode) => set({ compactMode }),
}));
