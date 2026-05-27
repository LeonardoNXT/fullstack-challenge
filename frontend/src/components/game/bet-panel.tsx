import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, CircleDollarSign, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSmoothMultiplier } from "@/hooks/use-smooth-multiplier";
import { queryKeys, cashOut, placeBet } from "@/services/game";
import type { PlayerProfile } from "@/types/auth";
import type { PublicBet, PublicRound, Wallet } from "@/types/game";
import {
  canCashOut,
  canPlaceBet,
  parseBetAmountToCents,
  projectedPayoutCents,
} from "@/features/game/rules";
import { formatCents, formatMultiplier } from "@/utils/format";

export function BetPanel({
  player,
  wallet,
  round,
  playerBet,
}: {
  readonly player: PlayerProfile | null;
  readonly wallet: Wallet | undefined;
  readonly round: PublicRound | null;
  readonly playerBet: PublicBet | null;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("10.00");
  const [autoCashout, setAutoCashout] = useState("1.50");
  const [autoBet, setAutoBet] = useState(false);
  const amountCents = useMemo(() => parseBetAmountToCents(amount), [amount]);
  const autoCashoutBps = useMemo(
    () => Math.round(Number(autoCashout.replace(",", ".")) * 10000),
    [autoCashout],
  );
  const multiplier = useSmoothMultiplier();
  const allowedBet = canPlaceBet({ round, playerBet, wallet, amountCents });
  const allowedCashout = canCashOut({ round, playerBet });
  const projected = playerBet === null
    ? projectedPayoutCents(amountCents || 0, multiplier)
    : projectedPayoutCents(playerBet.amountCents, multiplier);

  const placeBetMutation = useMutation({
    mutationFn: () => {
      if (player === null) {
        throw new Error("Login necessario");
      }

      return placeBet(player.token, amountCents, autoCashoutBps);
    },
    onSuccess: () => {
      toast.success("Aposta enviada", {
        description: "Aguardando confirmacao da Wallet.",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    },
    onError: (error) => {
      toast.error("Falha ao apostar", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: () => {
      if (player === null) {
        throw new Error("Login necessario");
      }

      return cashOut(player.token);
    },
    onSuccess: () => {
      toast.success("Cashout solicitado", {
        description: "O credito sera confirmado pela Wallet.",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    },
    onError: (error) => {
      toast.error("Falha no cashout", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-primary" />
          Aposta
        </CardTitle>
        <CardDescription>
          Uma aposta por jogador em cada rodada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={round?.phase !== "betting" || playerBet !== null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-cashout">Auto cashout</Label>
            <Input
              id="auto-cashout"
              inputMode="decimal"
              value={autoCashout}
              onChange={(event) => setAutoCashout(event.target.value)}
              disabled={round?.phase !== "betting" || playerBet !== null}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border bg-muted/35 p-3">
            <p className="text-xs text-muted-foreground">Payout atual</p>
            <p className="font-semibold">{formatCents(projected)}</p>
          </div>
          <div className="rounded-md border bg-muted/35 p-3">
            <p className="text-xs text-muted-foreground">Alvo automatico</p>
            <p className="font-semibold">{formatMultiplier(autoCashoutBps)}</p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 p-3 text-sm">
          <span>
            <span className="block font-medium">Auto bet</span>
            <span className="text-xs text-muted-foreground">
              Repete o valor quando uma nova fase de apostas abrir.
            </span>
          </span>
          <input
            className="h-5 w-5 accent-teal-300"
            type="checkbox"
            checked={autoBet}
            onChange={(event) => setAutoBet(event.target.checked)}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            disabled={player === null || !allowedBet || placeBetMutation.isPending}
            onClick={() => placeBetMutation.mutate()}
          >
            <CircleDollarSign className="h-4 w-4" />
            Apostar
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={player === null || !allowedCashout || cashoutMutation.isPending}
            onClick={() => cashoutMutation.mutate()}
          >
            <Zap className="h-4 w-4" />
            Cashout
          </Button>
        </div>

        {autoBet && round?.phase === "betting" && allowedBet && !placeBetMutation.isPending ? (
          <AutoBetTrigger onTrigger={() => placeBetMutation.mutate()} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function AutoBetTrigger({ onTrigger }: { readonly onTrigger: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onTrigger, 350);
    return () => window.clearTimeout(id);
  }, [onTrigger]);

  return null;
}
