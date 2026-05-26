import type { PublicRound } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import { toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { RoundRepository } from "../ports/round.repository";
import { OpenRoundUseCase, type OpenRoundInput } from "./open-round.use-case";

export type RoundEngineAction =
  | "opened"
  | "started"
  | "auto_cashed_out"
  | "crashed"
  | "settled";

export interface TickRoundEngineInput extends OpenRoundInput {
  readonly settlementDelayMs: number;
}

export interface TickRoundEngineOutput {
  readonly actions: readonly RoundEngineAction[];
  readonly round?: PublicRound;
  readonly autoCashedOutBets: readonly BetSnapshot[];
}

export class TickRoundEngineUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
    private readonly openRoundUseCase: OpenRoundUseCase,
  ) {}

  async execute(input: TickRoundEngineInput): Promise<TickRoundEngineOutput> {
    const now = this.clock.now();
    const currentRound = await this.roundRepository.findCurrent();

    if (currentRound === null) {
      const opened = await this.openRoundUseCase.execute(input);
      return { actions: ["opened"], round: opened, autoCashedOutBets: [] };
    }

    if (currentRound.phase === "betting") {
      if (now < currentRound.bettingClosesAt) {
        return {
          actions: [],
          round: toPublicRound(currentRound, now),
          autoCashedOutBets: [],
        };
      }

      currentRound.start(now);
      await this.roundRepository.save(currentRound);
      return {
        actions: ["started"],
        round: toPublicRound(currentRound, now),
        autoCashedOutBets: [],
      };
    }

    if (currentRound.phase === "running") {
      const actions: RoundEngineAction[] = [];
      const autoCashedOut = currentRound.applyAutoCashouts(now);
      if (autoCashedOut.length > 0) {
        actions.push("auto_cashed_out");
      }

      if (currentRound.currentMultiplierAt(now) >= currentRound.crashPointBps) {
        currentRound.crash(now);
        actions.push("crashed");
      }

      if (actions.length > 0) {
        await this.roundRepository.save(currentRound);
      }

      return {
        actions,
        round: toPublicRound(currentRound, now),
        autoCashedOutBets: autoCashedOut.map((bet) => bet.toSnapshot()),
      };
    }

    if (currentRound.phase === "crashed") {
      const crashedAt = currentRound.crashedAt;
      if (
        crashedAt === undefined ||
        now.getTime() - crashedAt.getTime() < input.settlementDelayMs
      ) {
        return {
          actions: [],
          round: toPublicRound(currentRound, now),
          autoCashedOutBets: [],
        };
      }

      currentRound.settle();
      await this.roundRepository.save(currentRound);
      const opened = await this.openRoundUseCase.execute(input);

      return {
        actions: ["settled", "opened"],
        round: opened,
        autoCashedOutBets: [],
      };
    }

    const opened = await this.openRoundUseCase.execute(input);
    return { actions: ["opened"], round: opened, autoCashedOutBets: [] };
  }
}
