import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { BetPanel } from "@/components/game/bet-panel";
import { BetsTable } from "@/components/game/bets-table";
import { CrashChart } from "@/components/game/crash-chart";
import { ProvablyFairPanel } from "@/components/game/provably-fair-panel";
import { RoundHistory } from "@/components/game/round-history";
import { LeaderboardPanel } from "@/components/leaderboard/leaderboard-panel";
import { WalletSummary } from "@/components/wallet/wallet-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useGameRealtime } from "@/hooks/use-game-realtime";
import { useWallet } from "@/hooks/use-wallet";
import { getPlayerBet } from "@/features/game/rules";
import { getCurrentRound, getRoundHistory, queryKeys } from "@/services/game";
import { useGameStore } from "@/stores/game-store";
import { useUiStore } from "@/stores/ui-store";

export function GameDashboard() {
  useGameRealtime();
  const auth = useAuth();
  const wallet = useWallet(auth.player);
  const liveRound = useGameStore((state) => state.liveRound);
  const setRound = useGameStore((state) => state.setRound);
  const setFairRoundId = useUiStore((state) => state.setFairRoundId);

  const currentRound = useQuery({
    queryKey: queryKeys.round,
    queryFn: getCurrentRound,
    refetchInterval: 4_000,
  });
  const history = useQuery({
    queryKey: queryKeys.history,
    queryFn: () => getRoundHistory(20),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (currentRound.data !== undefined) {
      setRound(currentRound.data);
    }
  }, [currentRound.data, setRound]);

  useEffect(() => {
    const first = history.data?.[0];
    if (first !== undefined) {
      setFairRoundId(first.roundId);
    }
  }, [history.data, setFairRoundId]);

  const round = liveRound ?? currentRound.data ?? null;
  const playerBet = useMemo(
    () => getPlayerBet(round, auth.player?.playerId),
    [auth.player?.playerId, round],
  );

  return (
    <main className="mx-auto grid max-w-[1480px] gap-4 px-4 pb-6 pt-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-6 xl:pl-[150px]">
      <section className="space-y-4">
        {currentRound.isLoading && round === null ? (
          <Skeleton className="h-[430px] w-full" />
        ) : (
          <CrashChart round={round} />
        )}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BetsTable bets={round?.bets ?? []} />
          <RoundHistory
            rounds={history.data ?? []}
            onSelect={(roundId) => setFairRoundId(roundId)}
          />
        </div>
      </section>

      <aside className="space-y-4">
        {auth.player === null ? (
          <div className="glass-card rounded-lg p-5">
            <p className="text-lg font-semibold">Entre para jogar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O estado da rodada e o historico sao publicos. Aposta e cashout exigem login.
            </p>
            <Button className="mt-4 w-full" onClick={auth.login} disabled={!auth.hydrated}>
              Login com Keycloak
            </Button>
          </div>
        ) : null}
        <WalletSummary wallet={wallet.data} loading={wallet.isLoading} />
        <BetPanel
          player={auth.player}
          wallet={wallet.data}
          round={round}
          playerBet={playerBet}
        />
        <LeaderboardPanel />
        <ProvablyFairPanel />
      </aside>
      <Toaster richColors closeButton position="top-right" theme="dark" />
    </main>
  );
}
