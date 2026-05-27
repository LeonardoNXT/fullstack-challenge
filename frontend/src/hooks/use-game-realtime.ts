import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { env } from "@/services/env";
import { queryKeys } from "@/services/game";
import { useGameStore } from "@/stores/game-store";
import type { PublicBet, PublicRound, RoundTick } from "@/types/game";

export function useGameRealtime(): void {
  const queryClient = useQueryClient();
  const setRound = useGameStore((state) => state.setRound);
  const applyTick = useGameStore((state) => state.applyTick);
  const upsertBet = useGameStore((state) => state.upsertBet);

  useEffect(() => {
    const socket = io(`${env.wsBaseUrl}/games`, {
      path: "/games/socket.io",
      transports: ["websocket", "polling"],
    });

    const invalidateRound = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history });
    };
    const invalidateWallet = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    };

    socket.on("round:betting-opened", (round: PublicRound) => {
      setRound(round);
      invalidateRound();
    });
    socket.on("round:started", (round: PublicRound) => {
      setRound(round);
      invalidateRound();
    });
    socket.on("round:tick", (tick: RoundTick) => {
      applyTick(tick);
    });
    socket.on("round:crashed", (round: PublicRound) => {
      setRound(round);
      invalidateRound();
      toast.error("Crash", {
        description: `A rodada parou em ${(round.crashPointBps ?? round.currentMultiplierBps) / 10000}x.`,
      });
    });
    socket.on("bet:placed", (bet: PublicBet) => {
      upsertBet(bet);
    });
    socket.on("bet:accepted", (bet: PublicBet) => {
      upsertBet(bet);
      invalidateWallet();
    });
    socket.on("bet:rejected", (bet: PublicBet) => {
      upsertBet(bet);
      invalidateWallet();
      toast.error("Aposta rejeitada", {
        description: bet.rejectionReason ?? "A Wallet recusou o debito.",
      });
    });
    socket.on("bet:cashed-out", (bet: PublicBet) => {
      upsertBet(bet);
      invalidateWallet();
      toast.success("Cashout confirmado", {
        description: `Pagamento registrado para ${bet.username}.`,
      });
    });
    socket.on("wallet:updated", invalidateWallet);

    return () => {
      socket.close();
    };
  }, [applyTick, queryClient, setRound, upsertBet]);
}
