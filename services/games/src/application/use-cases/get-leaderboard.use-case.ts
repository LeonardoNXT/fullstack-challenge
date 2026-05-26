import type { Cents, PlayerId } from "@crash/contracts";
import { makeCents } from "@crash/contracts";
import type { RoundRepository } from "../ports/round.repository";

export interface LeaderboardEntry {
  readonly playerId: PlayerId;
  readonly username: string;
  readonly profitCents: Cents;
  readonly wageredCents: Cents;
  readonly payoutCents: Cents;
}

interface MutableLeaderboardEntry {
  playerId: PlayerId;
  username: string;
  profitCents: number;
  wageredCents: number;
  payoutCents: number;
}

export class GetLeaderboardUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(limit = 10): Promise<readonly LeaderboardEntry[]> {
    const bets = await this.roundRepository.findAllBets(1000);
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
