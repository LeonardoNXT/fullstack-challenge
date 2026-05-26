import type { PlayerId } from "@crash/contracts";
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
    await this.roundRepository.save(round);
    const snapshot = result.bet.toSnapshot();

    if (
      this.walletCommandPublisher !== undefined &&
      this.walletCommandFactory !== undefined &&
      this.messageIdGenerator !== undefined
    ) {
      await this.walletCommandPublisher.publish(
        this.walletCommandFactory.cashoutCreditRequested(snapshot, {
          eventId: this.messageIdGenerator.nextEventId(),
          correlationId: this.messageIdGenerator.nextCorrelationId(),
          occurredAt: now,
        }),
      );
    }

    return {
      round: toPublicRound(round, now),
      payoutCents: result.payoutCents,
      multiplierBps: snapshot.cashoutMultiplierBps ?? round.currentMultiplierAt(now),
      bet: snapshot,
    };
  }
}
