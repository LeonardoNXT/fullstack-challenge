import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { formatCents, shortId } from "@/utils/format";

export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const auth = useAuth();
  const wallet = useWallet(auth.player);

  return (
    <div className="casino-grid min-h-screen">
      <aside aria-hidden="true" className="side-rail">
        <span className="side-rail-word">Discovery</span>
        <span className="side-rail-copy">
          Fair play.<br />
          Real-time.<br />
          Real results.
        </span>
      </aside>

      <header className="sticky top-0 z-30 px-4 pt-4">
        <div className="top-hud mx-auto flex w-full max-w-[560px] items-center justify-between gap-2 rounded-full px-3 py-2">
          <Badge variant="secondary" className="neon-pill hidden rounded-full sm:inline-flex">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Keycloak
          </Badge>

          {auth.player === null ? (
            <Button
              className="ml-auto rounded-full"
              onClick={auth.login}
              disabled={!auth.hydrated}
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div className="hud-segment hidden px-4 text-right sm:block">
                <p className="text-[0.68rem] uppercase text-muted-foreground">
                  {auth.player.username}
                </p>
                <p className="truncate text-sm font-black tracking-normal">
                  {wallet.isLoading
                    ? "Carregando"
                    : formatCents(wallet.data?.balanceCents ?? 0)}
                </p>
              </div>
              <div className="hud-segment min-w-0 px-3 text-right">
                <p className="text-[0.68rem] uppercase text-muted-foreground">Player</p>
                <p className="truncate text-xs font-semibold sm:text-sm">
                  {shortId(auth.player.playerId)}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={auth.logout}
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
