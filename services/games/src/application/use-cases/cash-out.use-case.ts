import type { PlayerId, WalletCommand } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import { GameApplicationError } from "../errors/game-application.error";
import { type CashoutResultView, toPublicRound } from "../dtos/game-round-view";
import type { Clock } from "../ports/clock";
import type { MessageIdGenerator } from "../ports/message-id-generator";
import type { RoundRepository } from "../ports/round.repository";
import type { WalletCommandPublisher } from "../ports/wallet-command-publisher";
import type { WalletCommandFactory } from "../services/wallet-command-factory";

export class CashOutUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
    private readonly walletCommandPublisher?: WalletCommandPublisher,
    private readonly walletCommandFactory?: WalletCommandFactory,
    private readonly messageIdGenerator?: MessageIdGenerator,
  ) {}

  async execute(playerId: PlayerId): Promise<CashoutResultView> {
    const round = await this.roundRepository.findCurrent();
    if (round === null) {
      throw new GameApplicationError("CURRENT_ROUND_NOT_FOUND");
    }

    const now = this.clock.now();
    const result = round.cashOut(playerId, now);
    const snapshot = result.bet.toSnapshot();
    const command = this.createCreditCommand(snapshot, now);

    if (command !== undefined && this.roundRepository.saveWithOutbox !== undefined) {
      await this.roundRepository.saveWithOutbox(round, [command]);
      return {
        round: toPublicRound(round, now),
        payoutCents: result.payoutCents,
        multiplierBps: snapshot.cashoutMultiplierBps ?? round.currentMultiplierAt(now),
        bet: snapshot,
      };
    }

    await this.roundRepository.save(round);

    if (command !== undefined) {
      await this.walletCommandPublisher?.publish(command);
    }

    return {
      round: toPublicRound(round, now),
      payoutCents: result.payoutCents,
      multiplierBps: snapshot.cashoutMultiplierBps ?? round.currentMultiplierAt(now),
      bet: snapshot,
    };
  }

  private createCreditCommand(bet: BetSnapshot, occurredAt: Date): WalletCommand | undefined {
    if (
      this.walletCommandFactory === undefined ||
      this.messageIdGenerator === undefined
    ) {
      return undefined;
    }

    return this.walletCommandFactory.cashoutCreditRequested(bet, {
      eventId: this.messageIdGenerator.nextEventId(),
      correlationId: this.messageIdGenerator.nextCorrelationId(),
      occurredAt,
    });
  }
}
