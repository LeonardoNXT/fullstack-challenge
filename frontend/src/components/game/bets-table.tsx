import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicBet } from "@/types/game";
import { formatCents, formatMultiplier } from "@/utils/format";

export function BetsTable({ bets }: { readonly bets: readonly PublicBet[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apostas da rodada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Jogador</th>
                <th className="py-2 text-right font-medium">Valor</th>
                <th className="py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-muted-foreground" colSpan={3}>
                    Nenhuma aposta nesta rodada.
                  </td>
                </tr>
              ) : (
                bets.map((bet) => (
                  <tr key={bet.betId} className="border-b border-border/70">
                    <td className="py-3">
                      <p className="font-medium">{bet.username}</p>
                      {bet.cashoutMultiplierBps !== undefined ? (
                        <p className="text-xs text-primary">
                          Cashout {formatMultiplier(bet.cashoutMultiplierBps)}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 text-right">{formatCents(bet.amountCents)}</td>
                    <td className="py-3 text-right">
                      <Badge variant={badgeVariant(bet.status)}>{bet.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function badgeVariant(status: PublicBet["status"]): "default" | "secondary" | "danger" | "muted" {
  if (status === "cashed_out") return "default";
  if (status === "accepted" || status === "pending") return "secondary";
  if (status === "lost" || status === "rejected") return "danger";
  return "muted";
}
