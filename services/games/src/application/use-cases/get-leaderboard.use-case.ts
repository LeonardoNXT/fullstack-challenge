import type { Cents, PlayerId } from "@crash/contracts";
import { makeCents } from "@crash/contracts";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";

export interface LeaderboardEntry {
  readonly playerId: PlayerId;
  readonly username: string;
  readonly profitCents: Cents;
  readonly wageredCents: Cents;
  readonly payoutCents: Cents;
}

export type LeaderboardWindow = "24h" | "week";

interface MutableLeaderboardEntry {
  playerId: PlayerId;
  username: string;
  profitCents: number;
  wageredCents: number;
  payoutCents: number;
}

export class GetLeaderboardUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock = { now: () => new Date() },
  ) {}

  async execute(limit = 10, window: LeaderboardWindow = "24h"): Promise<readonly LeaderboardEntry[]> {
    const bets = await this.roundRepository.findBetsSince(
      windowStart(window, this.clock.now()),
      5000,
    );
    const entries = new Map<PlayerId, MutableLeaderboardEntry>();

    for (const bet of bets) {
      if (bet.status !== "cashed_out" && bet.status !== "lost") {
        continue;
      }

      const current = entries.get(bet.playerId) ?? {
        playerId: bet.playerId,
        username: bet.username,
        profitCents: 0,
        wageredCents: 0,
        payoutCents: 0,
      };
      const payoutCents = bet.payoutCents ?? makeCents(0);

      current.wageredCents += bet.amountCents;
      current.payoutCents += payoutCents;
      current.profitCents += payoutCents - bet.amountCents;
      entries.set(bet.playerId, current);
    }

    return [...entries.values()]
      .sort((left, right) => right.profitCents - left.profitCents)
      .slice(0, limit)
      .map((entry) => ({
        playerId: entry.playerId,
        username: entry.username,
        profitCents: makeCents(entry.profitCents),
        wageredCents: makeCents(entry.wageredCents),
        payoutCents: makeCents(entry.payoutCents),
      }));
  }
}

function windowStart(window: LeaderboardWindow, now: Date): Date {
  const durationMs = window === "week" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - durationMs);
}
