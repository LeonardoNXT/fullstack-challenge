import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { LogIn, LogOut, RefreshCw, Zap } from "lucide-react";
import type { User } from "oidc-client-ts";
import {
  cashOut,
  getCurrentRound,
  getOrCreateWallet,
  getRoundHistory,
  placeBet,
} from "./api";
import { loadUserFromRedirect, userManager } from "./auth";
import { formatCents, formatMultiplier, shortHash } from "./format";
import {
  canCashOut,
  canPlaceBet,
  getPlayerBet,
  validateBetAmount,
} from "./game-ui";
import type { PublicBet, PublicRound, RoundTick } from "./types";

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "http://localhost:8000";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [amountCents, setAmountCents] = useState(1000);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUserFromRedirect()
      .then(setUser)
      .catch((error) => setNotice(String(error)))
      .finally(() => setAuthLoading(false));
  }, []);

  const token = user?.access_token;
  const playerId = typeof user?.profile.sub === "string" ? user.profile.sub : undefined;
  const username =
    typeof user?.profile.preferred_username === "string"
      ? user.profile.preferred_username
      : playerId;

  const currentRoundQuery = useQuery({
    queryKey: ["round", "current"],
    queryFn: getCurrentRound,
    refetchInterval: 5000,
  });
  const historyQuery = useQuery({
    queryKey: ["rounds", "history"],
    queryFn: getRoundHistory,
    refetchInterval: 10000,
  });
  const walletQuery = useQuery({
    queryKey: ["wallet", playerId],
    queryFn: () => getOrCreateWallet(token ?? ""),
    enabled: token !== undefined,
  });

  useEffect(() => {
    const socket = io(WS_BASE_URL, {
      path: "/games/socket.io",
    });

    const setRound = (round: PublicRound) => {
      queryClient.setQueryData(["round", "current"], round);
    };
    const mergeBet = (bet: PublicBet) => {
      queryClient.setQueryData<PublicRound | undefined>(["round", "current"], (round) => {
        if (round === undefined || round.roundId !== bet.roundId) {
          return round;
        }

        const nextBets = round.bets.some((candidate) => candidate.betId === bet.betId)
          ? round.bets.map((candidate) =>
              candidate.betId === bet.betId ? { ...candidate, ...bet } : candidate,
            )
          : [...round.bets, bet];

        return { ...round, bets: nextBets };
      });
    };

    socket.on("round:betting-opened", setRound);
    socket.on("round:started", setRound);
    socket.on("round:crashed", (round: PublicRound) => {
      setRound(round);
      void queryClient.invalidateQueries({ queryKey: ["rounds", "history"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet", playerId] });
    });
    socket.on("round:tick", (tick: RoundTick) => {
      queryClient.setQueryData<PublicRound | undefined>(["round", "current"], (round) =>
        round === undefined || round.roundId !== tick.roundId
          ? round
          : {
              ...round,
              serverTime: tick.serverTime,
              startedAt: tick.startedAt,
              currentMultiplierBps: tick.multiplierBps,
            },
      );
    });
    socket.on("bet:placed", mergeBet);
    socket.on("bet:accepted", (bet: PublicBet) => {
      mergeBet(bet);
      void queryClient.invalidateQueries({ queryKey: ["wallet", playerId] });
    });
    socket.on("bet:rejected", (bet: PublicBet) => {
      mergeBet(bet);
      setNotice("Bet rejected by wallet.");
    });
    socket.on("bet:cashed-out", (bet: PublicBet) => {
      mergeBet(bet);
      void queryClient.invalidateQueries({ queryKey: ["wallet", playerId] });
    });
    socket.on("wallet:updated", (payload: { playerId: string }) => {
      if (payload.playerId === playerId) {
        void queryClient.invalidateQueries({ queryKey: ["wallet", playerId] });
      }
    });

    return () => {
      socket.close();
    };
  }, [playerId, queryClient]);

  const round = currentRoundQuery.data;
  const wallet = walletQuery.data;
  const playerBet = getPlayerBet(round, playerId);
  const amountError = validateBetAmount(amountCents);

  const betMutation = useMutation({
    mutationFn: () => placeBet(token ?? "", amountCents),
    onSuccess: () => {
      setNotice("Bet placed. Waiting for wallet debit confirmation.");
      void queryClient.invalidateQueries({ queryKey: ["round", "current"] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : String(error)),
  });
  const cashoutMutation = useMutation({
    mutationFn: () => cashOut(token ?? ""),
    onSuccess: () => {
      setNotice("Cash out requested.");
      void queryClient.invalidateQueries({ queryKey: ["round", "current"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet", playerId] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : String(error)),
  });

  const countdownMs = useMemo(() => {
    if (round?.phase !== "betting") {
      return 0;
    }

    return Math.max(
      0,
      new Date(round.bettingClosesAt).getTime() - new Date(round.serverTime).getTime(),
    );
  }, [round]);

  const potentialPayout = Math.floor((amountCents * (round?.currentMultiplierBps ?? 10000)) / 10000);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Crash Game</p>
          <h1>Multiplier Room</h1>
        </div>
        <div className="player-strip">
          {token === undefined ? (
            <button className="icon-button primary" onClick={() => void userManager.signinRedirect()} disabled={authLoading}>
              <LogIn size={18} />
              Login
            </button>
          ) : (
            <>
              <div className="wallet-pill">
                <span>{username}</span>
                <strong>{wallet === undefined ? "Loading..." : formatCents(wallet.balanceCents)}</strong>
              </div>
              <button className="icon-button" onClick={() => void userManager.signoutRedirect()}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {notice !== null && (
        <button className="toast" onClick={() => setNotice(null)}>
          {notice}
        </button>
      )}

      <section className="game-layout">
        <section className="stage">
          <div className="stage-header">
            <div>
              <span className={`phase phase-${round?.phase ?? "loading"}`}>
                {round?.phase ?? "loading"}
              </span>
              <p>Seed hash {round === undefined ? "..." : shortHash(round.serverSeedHash)}</p>
            </div>
            <button className="icon-only" onClick={() => void currentRoundQuery.refetch()} title="Refresh round">
              <RefreshCw size={18} />
            </button>
          </div>

          <div className={`multiplier ${round?.phase === "crashed" ? "crashed" : ""}`}>
            {round === undefined ? "1.00x" : formatMultiplier(round.currentMultiplierBps)}
          </div>
          <CrashCurve round={round} />
          <div className="stage-footer">
            <span>Betting closes in {(countdownMs / 1000).toFixed(1)}s</span>
            <span>Potential {formatCents(potentialPayout)}</span>
          </div>
        </section>

        <aside className="bet-panel">
          <h2>Bet</h2>
          <label>
            Amount in cents
            <input
              value={amountCents}
              inputMode="numeric"
              onChange={(event) => setAmountCents(Number(event.target.value))}
            />
          </label>
          {amountError !== null && <p className="field-error">{amountError}</p>}

          <button
            className="action-button"
            disabled={
              token === undefined ||
              amountError !== null ||
              !canPlaceBet(round, playerBet) ||
              betMutation.isPending
            }
            onClick={() => betMutation.mutate()}
          >
            <Zap size={18} />
            Place Bet
          </button>
          <button
            className="action-button cashout"
            disabled={
              token === undefined ||
              !canCashOut(round, playerBet) ||
              cashoutMutation.isPending
            }
            onClick={() => cashoutMutation.mutate()}
          >
            Cash Out {formatCents(playerBet?.payoutCents ?? potentialPayout)}
          </button>

          <div className="status-box">
            <span>Your bet</span>
            <strong>{playerBet === undefined ? "none" : playerBet.status.replace("_", " ")}</strong>
          </div>
        </aside>
      </section>

      <section className="lower-grid">
        <RoundBets bets={round?.bets ?? []} />
        <History rounds={historyQuery.data ?? []} />
      </section>
    </main>
  );
}

function CrashCurve({ round }: { readonly round: PublicRound | undefined }) {
  const progress = Math.min(1, ((round?.currentMultiplierBps ?? 10000) - 10000) / 40000);
  const x = 30 + progress * 300;
  const y = 180 - progress * 145;

  return (
    <svg className="curve" viewBox="0 0 360 210" role="img" aria-label="Crash multiplier curve">
      <path d={`M 20 185 C 105 185, 178 ${185 - progress * 80}, ${x} ${y}`} />
      <circle cx={x} cy={y} r="7" />
    </svg>
  );
}

function RoundBets({ bets }: { readonly bets: readonly PublicBet[] }) {
  return (
    <section className="panel">
      <h2>Current Bets</h2>
      <div className="bet-list">
        {bets.length === 0 ? (
          <p className="muted">No bets in this round yet.</p>
        ) : (
          bets.map((bet) => (
            <div className="bet-row" key={bet.betId}>
              <span>{bet.username}</span>
              <strong>{formatCents(bet.amountCents)}</strong>
              <em className={`status status-${bet.status}`}>{bet.status.replace("_", " ")}</em>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function History({ rounds }: { readonly rounds: readonly PublicRound[] }) {
  return (
    <section className="panel">
      <h2>History</h2>
      <div className="history-list">
        {rounds.length === 0 ? (
          <p className="muted">Settled rounds will appear here.</p>
        ) : (
          rounds.map((round) => (
            <span
              className={`history-chip ${
                (round.crashPointBps ?? 0) < 20000 ? "low" : "high"
              }`}
              key={round.roundId}
            >
              {formatMultiplier(round.crashPointBps ?? round.currentMultiplierBps)}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
