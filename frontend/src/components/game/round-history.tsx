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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {rounds.map((round) => {
            const multiplier = round.crashPointBps ?? round.currentMultiplierBps;
            const hot = multiplier >= 20000;
            return (
              <button
                key={round.roundId}
                className={[
                  "rounded-md border px-3 py-2 text-sm font-bold transition hover:scale-[1.02]",
                  hot
                    ? "border-primary/[0.35] bg-primary/[0.12] text-primary shadow-[0_0_20px_rgb(186_255_0_/_0.08)]"
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
