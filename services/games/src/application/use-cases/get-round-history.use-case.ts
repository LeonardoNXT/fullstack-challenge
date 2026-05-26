import type { PublicRound } from "@crash/contracts";
import { toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";

export class GetRoundHistoryUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
  ) {}

  async execute(limit = 20): Promise<readonly PublicRound[]> {
    const rounds = await this.roundRepository.findRecentSettled(limit);
    const now = this.clock.now();

    return rounds.map((round) => toPublicRound(round, now));
  }
}
