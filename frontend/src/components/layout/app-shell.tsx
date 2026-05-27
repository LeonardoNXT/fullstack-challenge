import { Activity, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { env } from "@/services/env";
import { formatCents, shortId } from "@/utils/format";

export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const auth = useAuth();
  const wallet = useWallet(auth.player);

  return (
    <div className="casino-grid min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-primary shadow-[0_0_28px_rgb(45_212_191_/_0.22)]">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-normal">{env.gameTitle}</h1>
              <p className="truncate text-xs text-muted-foreground">
                Crash game em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Keycloak
            </Badge>
            {auth.player === null ? (
              <Button onClick={auth.login} disabled={!auth.hydrated}>
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            ) : (
              <>
                <div className="hidden rounded-md border bg-muted/40 px-3 py-2 text-right sm:block">
                  <p className="text-xs text-muted-foreground">{auth.player.username}</p>
                  <p className="text-sm font-semibold">
                    {wallet.isLoading
                      ? "Carregando"
                      : formatCents(wallet.data?.balanceCents ?? 0)}
                  </p>
                </div>
                <div className="hidden rounded-md border bg-muted/40 px-3 py-2 text-right md:block">
                  <p className="text-xs text-muted-foreground">Player</p>
                  <p className="text-xs font-medium">{shortId(auth.player.playerId)}</p>
                </div>
                <Button variant="outline" size="icon" onClick={auth.logout} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
