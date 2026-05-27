import type { PublicRound, WalletCommand } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import { toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { RealtimeEventBus } from "../ports/realtime-event-bus";
import type { RoundRepository } from "../ports/round.repository";
import type { MessageIdGenerator } from "../ports/message-id-generator";
import { RealtimeEventFactory } from "../services/realtime-event-factory";
import type { WalletCommandFactory } from "../services/wallet-command-factory";
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
    private readonly realtimeEventBus?: RealtimeEventBus,
    private readonly realtimeEventFactory = new RealtimeEventFactory(),
    private readonly walletCommandFactory?: WalletCommandFactory,
    private readonly messageIdGenerator?: MessageIdGenerator,
  ) {}

  async execute(input: TickRoundEngineInput): Promise<TickRoundEngineOutput> {
    const now = this.clock.now();
    const currentRound = await this.roundRepository.findCurrent();

    if (currentRound === null) {
      const opened = await this.openRoundUseCase.execute(input);
      return this.publish({ actions: ["opened"], round: opened, autoCashedOutBets: [] });
    }

    if (currentRound.phase === "betting") {
      if (now < currentRound.bettingClosesAt) {
        return this.publish({
          actions: [],
          round: toPublicRound(currentRound, now),
          autoCashedOutBets: [],
        });
      }

      currentRound.start(now);
      await this.roundRepository.save(currentRound);
      return this.publish({
        actions: ["started"],
        round: toPublicRound(currentRound, now),
        autoCashedOutBets: [],
      });
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
        const commands = this.createAutoCashoutCommands(
          autoCashedOut.map((bet) => bet.toSnapshot()),
          now,
        );
        if (commands.length > 0 && this.roundRepository.saveWithOutbox !== undefined) {
          await this.roundRepository.saveWithOutbox(currentRound, commands);
        } else {
          await this.roundRepository.save(currentRound);
        }
      }

      return this.publish({
        actions,
        round: toPublicRound(currentRound, now),
        autoCashedOutBets: autoCashedOut.map((bet) => bet.toSnapshot()),
      });
    }

    if (currentRound.phase === "crashed") {
      const crashedAt = currentRound.crashedAt;
      if (
        crashedAt === undefined ||
        now.getTime() - crashedAt.getTime() < input.settlementDelayMs
      ) {
        return this.publish({
          actions: [],
          round: toPublicRound(currentRound, now),
          autoCashedOutBets: [],
        });
      }

      currentRound.settle();
      await this.roundRepository.save(currentRound);
      const opened = await this.openRoundUseCase.execute(input);

      return this.publish({
        actions: ["settled", "opened"],
        round: opened,
        autoCashedOutBets: [],
      });
    }

    const opened = await this.openRoundUseCase.execute(input);
    return this.publish({ actions: ["opened"], round: opened, autoCashedOutBets: [] });
  }

  private createAutoCashoutCommands(
    bets: readonly BetSnapshot[],
    occurredAt: Date,
  ): readonly WalletCommand[] {
    if (
      this.walletCommandFactory === undefined ||
      this.messageIdGenerator === undefined
    ) {
      return [];
    }

    return bets.map((bet) =>
      this.walletCommandFactory!.cashoutCreditRequested(bet, {
        eventId: this.messageIdGenerator!.nextEventId(),
        correlationId: this.messageIdGenerator!.nextCorrelationId(),
        occurredAt,
      }),
    );
  }

  private async publish(output: TickRoundEngineOutput): Promise<TickRoundEngineOutput> {
    if (this.realtimeEventBus === undefined) {
      return output;
    }

    for (const event of this.realtimeEventFactory.fromTickResult(output)) {
      await this.realtimeEventBus.publish(event);
    }

    return output;
  }
}
