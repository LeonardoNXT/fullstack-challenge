import type { RoundId } from "@crash/contracts";
import { ProvablyFairService, type ProvablyFairVerification } from "../../domain";
import { GameApplicationError } from "../errors/game-application.error";
import type { RoundRepository } from "../ports/round.repository";

export class VerifyRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async execute(roundId: RoundId): Promise<ProvablyFairVerification> {
    const round = await this.roundRepository.findById(roundId);
    if (round === null) {
      throw new GameApplicationError("ROUND_NOT_FOUND");
    }

    const snapshot = round.toSnapshot();
    return this.provablyFairService.verify({
      serverSeed: snapshot.serverSeed,
      serverSeedHash: snapshot.serverSeedHash,
      clientSeed: snapshot.clientSeed,
      nonce: snapshot.nonce,
    });
  }
}
