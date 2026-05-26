import type { PlayerId } from "@crash/contracts";
import { GameApplicationError } from "../errors/game-application.error";
import { type CashoutResultView, toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";

export class CashOutUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
  ) {}

  async execute(playerId: PlayerId): Promise<CashoutResultView> {
    const round = await this.roundRepository.findCurrent();
    if (round === null) {
      throw new GameApplicationError("CURRENT_ROUND_NOT_FOUND");
    }

    const now = this.clock.now();
    const result = round.cashOut(playerId, now);
    await this.roundRepository.save(round);
    const snapshot = result.bet.toSnapshot();

    return {
      round: toPublicRound(round, now),
      payoutCents: result.payoutCents,
      multiplierBps: snapshot.cashoutMultiplierBps ?? round.currentMultiplierAt(now),
      bet: snapshot,
    };
  }
}
