import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys, verifyRound } from "@/services/game";
import { useUiStore } from "@/stores/ui-store";
import { formatMultiplier, shortId } from "@/utils/format";

export function ProvablyFairPanel() {
  const roundId = useUiStore((state) => state.fairRoundId);
  const verification = useQuery({
    queryKey: roundId === null ? ["fair", "none"] : queryKeys.verify(roundId),
    queryFn: () => {
      if (roundId === null) {
        throw new Error("No round selected");
      }

      return verifyRound(roundId);
    },
    enabled: roundId !== null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Provably fair
        </CardTitle>
        <CardDescription>
          A seed hash fica visivel antes das apostas. A seed revelada permite verificar o crash.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {roundId === null ? (
          <p className="text-sm text-muted-foreground">
            Selecione uma rodada no historico para verificar.
          </p>
        ) : verification.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        ) : verification.data === undefined ? (
          <p className="text-sm text-muted-foreground">
            Dados de verificacao indisponiveis para esta rodada.
          </p>
        ) : (
          <div className="grid gap-3 text-sm">
            <Fact label="Round" value={shortId(roundId)} />
            <Fact label="Server seed" value={shortId(verification.data.serverSeed)} />
            <Fact label="Hash" value={shortId(verification.data.serverSeedHash)} />
            <Fact label="Client seed" value={verification.data.clientSeed} />
            <Fact label="Nonce" value={String(verification.data.nonce)} />
            <Fact label="Crash" value={formatMultiplier(verification.data.crashPointBps)} />
            <Fact
              label="Hash valida"
              value={verification.data.validSeedHash ? "sim" : "nao"}
            />
            <div className="data-row rounded-md border border-white/10 p-3 text-xs text-muted-foreground">
              formula: multiplier(t) = 1.00x + floor(elapsedMs * growthBpsPerSecond / 1000) / 10000, limitada pelo crashPointBps.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="data-row flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
