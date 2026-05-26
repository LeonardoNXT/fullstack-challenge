import type { BetSnapshot } from "../../domain";
import type { PlayerId } from "@crash/contracts";
import type { RoundRepository } from "../ports/round.repository";

export class GetPlayerBetsUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(playerId: PlayerId, limit = 50): Promise<readonly BetSnapshot[]> {
    return this.roundRepository.findBetsByPlayerId(playerId, limit);
  }
}
