import type { PublicRound } from "@crash/contracts";
import { GameApplicationError } from "../errors/game-application.error";
import { toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";

export class StartRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<PublicRound> {
    const round = await this.roundRepository.findCurrent();
    if (round === null) {
      throw new GameApplicationError("CURRENT_ROUND_NOT_FOUND");
    }

    const now = this.clock.now();
    round.start(now);
    await this.roundRepository.save(round);

    return toPublicRound(round, now);
  }
}
