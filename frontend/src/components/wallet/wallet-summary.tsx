import { WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Wallet } from "@/types/game";
import { formatCents } from "@/utils/format";

export function WalletSummary({
  wallet,
  loading,
}: {
  readonly wallet: Wallet | undefined;
  readonly loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-28 bg-primary/[0.18] blur-3xl" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <WalletCards className="h-4 w-4 text-primary" />
          Carteira
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <p className="text-3xl font-black">{formatCents(wallet?.balanceCents ?? 0)}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Debitos e creditos sao processados via RabbitMQ.
        </p>
      </CardContent>
    </Card>
  );
}
