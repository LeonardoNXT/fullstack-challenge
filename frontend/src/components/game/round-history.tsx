import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicRound } from "@/types/game";
import { formatMultiplier } from "@/utils/format";

export function RoundHistory({
  rounds,
  onSelect,
}: {
  readonly rounds: readonly PublicRound[];
  readonly onSelect: (roundId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {rounds.map((round) => {
            const multiplier = round.crashPointBps ?? round.currentMultiplierBps;
            const hot = multiplier >= 20000;
            return (
              <button
                key={round.roundId}
                className={[
                  "rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-muted",
                  hot
                    ? "border-primary/30 bg-primary/12 text-primary"
                    : "border-red-400/30 bg-red-500/10 text-red-200",
                ].join(" ")}
                onClick={() => onSelect(round.roundId)}
              >
                {formatMultiplier(multiplier)}
              </button>
            );
          })}
          {rounds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aguardando rodadas finalizadas.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
