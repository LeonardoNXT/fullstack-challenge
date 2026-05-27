import { create } from "zustand";
import type { PlayerProfile } from "@/types/auth";

interface AuthState {
  readonly player: PlayerProfile | null;
  readonly hydrated: boolean;
  setPlayer(player: PlayerProfile | null): void;
  setHydrated(hydrated: boolean): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  player: null,
  hydrated: false,
  setPlayer: (player) => set({ player }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
