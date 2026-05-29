import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CrashCanvas } from "@/components/game/crash-canvas";
import type { PublicRound } from "@/types/game";
import { formatTimeLeft, shortId } from "@/utils/format";

export function CrashChart({ round }: { readonly round: PublicRound | null }) {
  const crashed = round?.phase === "crashed" || round?.phase === "settled";
  const progress =
    round?.phase === "betting"
      ? bettingProgress(round)
      : round?.phase === "running"
        ? runningProgress(round)
        : crashed
          ? 100
          : 0;

  return (
    <Card className="chart-shell overflow-hidden">
      <CardContent className="relative min-h-[430px] p-0">
        <div className="relative flex h-full min-h-[430px] flex-col justify-between">
          <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-5">
            <div>
              <Badge variant={crashed ? "danger" : "default"}>
                {round?.phase ?? "sincronizando"}
              </Badge>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                Seed hash {shortId(round?.serverSeedHash)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/[0.35] px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Fecha apostas em</p>
              <p className="text-lg font-semibold">
                {round?.phase === "betting"
                  ? formatTimeLeft(round.bettingClosesAt)
                  : "--"}
              </p>
            </div>
          </div>

          <div className="flex-1" style={{ minHeight: 320 }}>
            <CrashCanvas round={round} />
          </div>

          <div className="space-y-2 bg-black/[0.28] p-5 pt-0">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fase da rodada</span>
              <span>
                {round?.roundId === undefined ? "-" : shortId(round.roundId)}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function bettingProgress(round: PublicRound): number {
  const opened = new Date(round.bettingOpenedAt).getTime();
  const closes = new Date(round.bettingClosesAt).getTime();
  const now = Date.now();
  const total = Math.max(1, closes - opened);
  return Math.max(0, Math.min(100, ((now - opened) / total) * 100));
}

function runningProgress(round: PublicRound): number {
  // Map multiplier to a rough progress (1x=0% to ~5x=100%)
  const mult = (round.currentMultiplierBps ?? 10000) / 10000;
  return Math.min(100, Math.max(0, ((mult - 1) / 4) * 100));
}
