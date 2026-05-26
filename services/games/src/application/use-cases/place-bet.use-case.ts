import type { Cents, MultiplierBps, PlayerId } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import { GameApplicationError } from "../errors/game-application.error";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { MessageIdGenerator } from "../ports/message-id-generator";
import type { RoundRepository } from "../ports/round.repository";
import type { WalletCommandPublisher } from "../ports/wallet-command-publisher";
import type { WalletCommandFactory } from "../services/wallet-command-factory";

export interface PlaceBetInput {
  readonly playerId: PlayerId;
  readonly username: string;
  readonly amountCents: Cents;
  readonly autoCashoutMultiplierBps?: MultiplierBps;
}

export class PlaceBetUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly walletCommandPublisher?: WalletCommandPublisher,
    private readonly walletCommandFactory?: WalletCommandFactory,
    private readonly messageIdGenerator?: MessageIdGenerator,
  ) {}

  async execute(input: PlaceBetInput): Promise<BetSnapshot> {
    const round = await this.roundRepository.findCurrent();
    if (round === null) {
      throw new GameApplicationError("CURRENT_ROUND_NOT_FOUND");
    }

    const bet = round.placeBet({
      betId: this.idGenerator.nextBetId(),
      playerId: input.playerId,
      username: input.username,
      amountCents: input.amountCents,
      placedAt: this.clock.now(),
      autoCashoutMultiplierBps: input.autoCashoutMultiplierBps,
    });
    await this.roundRepository.save(round);
    const snapshot = bet.toSnapshot();

    if (
      this.walletCommandPublisher !== undefined &&
      this.walletCommandFactory !== undefined &&
      this.messageIdGenerator !== undefined
    ) {
      await this.walletCommandPublisher.publish(
        this.walletCommandFactory.betDebitRequested(snapshot, {
          eventId: this.messageIdGenerator.nextEventId(),
          correlationId: this.messageIdGenerator.nextCorrelationId(),
          occurredAt: this.clock.now(),
        }),
      );
    }

    return snapshot;
  }
}
