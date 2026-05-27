import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSmoothMultiplier } from "@/hooks/use-smooth-multiplier";
import type { PublicRound } from "@/types/game";
import { formatMultiplier, formatTimeLeft, shortId } from "@/utils/format";

export function CrashChart({ round }: { readonly round: PublicRound | null }) {
  const multiplier = useSmoothMultiplier();
  const progress = round?.phase === "betting"
    ? bettingProgress(round)
    : Math.min(100, Math.max(8, ((multiplier - 10000) / 40000) * 100));
  const path = useMemo(() => makeCurvePath(progress), [progress]);
  const crashed = round?.phase === "crashed" || round?.phase === "settled";

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative min-h-[430px] p-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent)]" />
        <div className="relative flex h-full min-h-[430px] flex-col justify-between p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant={crashed ? "danger" : "default"}>
                {round?.phase ?? "sincronizando"}
              </Badge>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                Seed hash {shortId(round?.serverSeedHash)}
              </p>
            </div>
            <div className="rounded-lg border bg-background/60 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Fecha apostas em</p>
              <p className="text-lg font-semibold">
                {round?.phase === "betting" ? formatTimeLeft(round.bettingClosesAt) : "--"}
              </p>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-6">
            <svg
              viewBox="0 0 900 360"
              className="h-full max-h-[300px] w-full"
              role="img"
              aria-label="Curva do crash"
            >
              <defs>
                <linearGradient id="curve" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="55%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
              <path
                d="M40 310 C 230 305, 380 280, 520 205 S 740 65, 860 34"
                fill="none"
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="4"
              />
              <path
                d={path}
                className="crash-line"
                fill="none"
                stroke="url(#curve)"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <g opacity="0.32">
                {Array.from({ length: 7 }).map((_, index) => (
                  <line
                    key={index}
                    x1="40"
                    x2="860"
                    y1={60 + index * 42}
                    y2={60 + index * 42}
                    stroke="white"
                    strokeDasharray="6 10"
                  />
                ))}
              </g>
            </svg>
            <div className="absolute text-center">
              <p
                className={[
                  "neon-text text-6xl font-black tracking-normal sm:text-7xl",
                  crashed ? "text-red-300" : "text-primary",
                ].join(" ")}
              >
                {formatMultiplier(multiplier)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {crashed ? "Crash confirmado" : "Multiplicador ao vivo"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fase da rodada</span>
              <span>{round?.roundId === undefined ? "-" : shortId(round.roundId)}</span>
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

function makeCurvePath(progress: number): string {
  const x = 40 + (820 * progress) / 100;
  const y = 310 - Math.pow(progress / 100, 1.8) * 276;
  return `M40 310 C 230 305, 380 280, ${Math.min(520, x)} ${Math.max(205, y)} S ${Math.min(740, x)} ${Math.max(65, y)}, ${x} ${y}`;
}
