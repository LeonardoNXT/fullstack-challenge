import type {
  MultiplierBps,
  PublicBet,
  PublicRound,
} from "@crash/contracts";
import type { BetSnapshot, Round } from "../../domain";

export function toPublicRound(round: Round, serverTime: Date): PublicRound {
  const snapshot = round.toSnapshot();

  return {
    roundId: snapshot.roundId,
    phase: snapshot.phase,
    serverTime: serverTime.toISOString(),
    bettingOpenedAt: snapshot.bettingOpenedAt.toISOString(),
    bettingClosesAt: snapshot.bettingClosesAt.toISOString(),
    startedAt: snapshot.startedAt?.toISOString(),
    crashedAt: snapshot.crashedAt?.toISOString(),
    currentMultiplierBps: round.currentMultiplierAt(serverTime),
    crashPointBps:
      snapshot.phase === "crashed" || snapshot.phase === "settled"
        ? snapshot.crashPointBps
        : undefined,
    serverSeedHash: snapshot.serverSeedHash,
    bets: snapshot.bets.map((bet): PublicBet => ({
      betId: bet.betId,
      roundId: bet.roundId,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents,
      status: bet.status,
      cashoutMultiplierBps: bet.cashoutMultiplierBps,
      payoutCents: bet.payoutCents,
    })),
  };
}

export interface CashoutResultView {
  readonly round: PublicRound;
  readonly payoutCents: number;
  readonly multiplierBps: MultiplierBps;
  readonly bet: BetSnapshot;
}
