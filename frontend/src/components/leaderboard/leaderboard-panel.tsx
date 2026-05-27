import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard, queryKeys } from "@/services/game";
import { useUiStore } from "@/stores/ui-store";
import { formatCents, shortId } from "@/utils/format";

export function LeaderboardPanel() {
  const window = useUiStore((state) => state.leaderboardWindow);
  const setWindow = useUiStore((state) => state.setLeaderboardWindow);
  const leaderboard = useQuery({
    queryKey: queryKeys.leaderboard(window),
    queryFn: () => getLeaderboard(window),
    refetchInterval: 10_000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          <div className="flex rounded-md border bg-muted/30 p-1">
            <Button
              size="sm"
              variant={window === "24h" ? "default" : "ghost"}
              onClick={() => setWindow("24h")}
            >
              24h
            </Button>
            <Button
              size="sm"
              variant={window === "week" ? "default" : "ghost"}
              onClick={() => setWindow("week")}
            >
              Semana
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.isLoading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          leaderboard.data?.map((entry, index) => (
            <div
              key={entry.playerId}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  #{index + 1} {entry.username}
                </p>
                <p className="text-xs text-muted-foreground">{shortId(entry.playerId)}</p>
              </div>
              <div className="text-right">
                <p className={entry.profitCents >= 0 ? "text-primary" : "text-red-300"}>
                  {formatCents(entry.profitCents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  volume {formatCents(entry.wageredCents)}
                </p>
              </div>
            </div>
          ))
        )}
        {!leaderboard.isLoading && leaderboard.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem apostas liquidadas nesta janela.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
