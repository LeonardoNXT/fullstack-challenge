import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getUserManager, loadOidcUser, toPlayerProfile } from "@/services/auth";
import { queryKeys } from "@/services/game";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const queryClient = useQueryClient();
  const player = useAuthStore((state) => state.player);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setPlayer = useAuthStore((state) => state.setPlayer);
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    let active = true;

    loadOidcUser()
      .then((user) => {
        if (!active) {
          return;
        }

        setPlayer(toPlayerProfile(user));
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [setHydrated, setPlayer]);

  return {
    player,
    hydrated,
    login: () => getUserManager().signinRedirect(),
    logout: async () => {
      setPlayer(null);
      queryClient.removeQueries({ queryKey: queryKeys.wallet });
      await getUserManager().signoutRedirect();
    },
  };
}
