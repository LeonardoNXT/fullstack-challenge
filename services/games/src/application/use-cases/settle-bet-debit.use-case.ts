import type { BetId, RoundId } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import { GameApplicationError } from "../errors/game-application.error";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";

export interface AcceptBetDebitInput {
  readonly roundId: RoundId;
  readonly betId: BetId;
}

export interface RejectBetDebitInput extends AcceptBetDebitInput {
  readonly reason: string;
}

export class AcceptBetDebitUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(input: AcceptBetDebitInput): Promise<BetSnapshot> {
    const round = await this.roundRepository.findById(input.roundId);
    if (round === null) {
      throw new GameApplicationError("ROUND_NOT_FOUND");
    }

    const bet = round.acceptBet(input.betId);
    await this.roundRepository.save(round);
    return bet.toSnapshot();
  }
}

export class RejectBetDebitUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RejectBetDebitInput): Promise<BetSnapshot> {
    const round = await this.roundRepository.findById(input.roundId);
    if (round === null) {
      throw new GameApplicationError("ROUND_NOT_FOUND");
    }

    const bet = round.rejectBet(input.betId, input.reason, this.clock.now());
    await this.roundRepository.save(round);
    return bet.toSnapshot();
  }
}
