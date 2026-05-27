import { useQuery } from "@tanstack/react-query";
import { getOrCreateWallet, queryKeys } from "@/services/game";
import type { PlayerProfile } from "@/types/auth";

export function useWallet(player: PlayerProfile | null) {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: () => {
      if (player === null) {
        throw new Error("Missing player");
      }

      return getOrCreateWallet(player.token);
    },
    enabled: player !== null,
    refetchInterval: 5_000,
  });
}
