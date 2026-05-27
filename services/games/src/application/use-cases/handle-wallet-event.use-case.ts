import { WALLET_ROUTING_KEYS, type WalletEvent } from "@crash/contracts";
import type { BetSnapshot } from "../../domain";
import type { Clock } from "../ports/clock";
import type { ProcessedWalletEventStore } from "../ports/processed-wallet-event-store";
import type { RealtimeEventBus } from "../ports/realtime-event-bus";
import type { RoundRepository } from "../ports/round.repository";
import type { RealtimeEventFactory } from "../services/realtime-event-factory";
import type {
  AcceptBetDebitUseCase,
  RejectBetDebitUseCase,
} from "./settle-bet-debit.use-case";

export interface HandleWalletEventOutput {
  readonly handled: boolean;
  readonly duplicate: boolean;
  readonly bet?: BetSnapshot;
}

export class HandleWalletEventUseCase {
  constructor(
    private readonly acceptBetDebitUseCase: AcceptBetDebitUseCase,
    private readonly rejectBetDebitUseCase: RejectBetDebitUseCase,
    private readonly processedWalletEventStore: ProcessedWalletEventStore,
    private readonly realtimeEventBus?: RealtimeEventBus,
    private readonly realtimeEventFactory?: RealtimeEventFactory,
    private readonly roundRepository?: RoundRepository,
    private readonly clock?: Clock,
  ) {}

  async execute(event: WalletEvent): Promise<HandleWalletEventOutput> {
    if (
      this.roundRepository?.processWalletEventWithInbox !== undefined &&
      this.clock !== undefined
    ) {
      const output = await this.roundRepository.processWalletEventWithInbox(
        event,
        this.clock.now(),
      );
      if (output.duplicate || !output.handled) {
        return output;
      }

      await this.publishRealtime(event, output.bet);
      return output;
    }

    if (await this.processedWalletEventStore.has(event.eventId)) {
      return { handled: false, duplicate: true };
    }

    if (event.type === WALLET_ROUTING_KEYS.betDebited) {
      const bet = await this.acceptBetDebitUseCase.execute({
        roundId: event.payload.roundId,
        betId: event.payload.betId,
      });
      await this.processedWalletEventStore.record(event.eventId);
      await this.realtimeEventBus?.publish(this.realtimeEventFactory?.betAccepted(bet) ?? {
        type: "bet:accepted",
        payload: bet,
      });
      await this.realtimeEventBus?.publish(
        this.realtimeEventFactory?.walletUpdated(event.payload.playerId) ?? {
          type: "wallet:updated",
          payload: { playerId: event.payload.playerId },
        },
      );

      return { handled: true, duplicate: false, bet };
    }

    if (event.type === WALLET_ROUTING_KEYS.betDebitRejected) {
      const bet = await this.rejectBetDebitUseCase.execute({
        roundId: event.payload.roundId,
        betId: event.payload.betId,
        reason: event.payload.reason,
      });
      await this.processedWalletEventStore.record(event.eventId);
      await this.realtimeEventBus?.publish(this.realtimeEventFactory?.betRejected(bet) ?? {
        type: "bet:rejected",
        payload: bet,
      });
      await this.realtimeEventBus?.publish(
        this.realtimeEventFactory?.walletUpdated(event.payload.playerId) ?? {
          type: "wallet:updated",
          payload: { playerId: event.payload.playerId },
        },
      );

      return { handled: true, duplicate: false, bet };
    }

    if (
      event.type === WALLET_ROUTING_KEYS.cashoutCredited ||
      event.type === WALLET_ROUTING_KEYS.cashoutCreditRejected ||
      event.type === WALLET_ROUTING_KEYS.betRefunded
    ) {
      await this.processedWalletEventStore.record(event.eventId);
      await this.realtimeEventBus?.publish(
        this.realtimeEventFactory?.walletUpdated(event.payload.playerId) ?? {
          type: "wallet:updated",
          payload: { playerId: event.payload.playerId },
        },
      );

      return { handled: true, duplicate: false };
    }

    return { handled: false, duplicate: false };
  }

  private async publishRealtime(
    event: WalletEvent,
    bet: BetSnapshot | undefined,
  ): Promise<void> {
    if (event.type === WALLET_ROUTING_KEYS.betDebited && bet !== undefined) {
      await this.realtimeEventBus?.publish(
        this.realtimeEventFactory?.betAccepted(bet) ?? {
          type: "bet:accepted",
          payload: bet,
        },
      );
    }

    if (event.type === WALLET_ROUTING_KEYS.betDebitRejected && bet !== undefined) {
      await this.realtimeEventBus?.publish(
        this.realtimeEventFactory?.betRejected(bet) ?? {
          type: "bet:rejected",
          payload: bet,
        },
      );
    }

    await this.realtimeEventBus?.publish(
      this.realtimeEventFactory?.walletUpdated(event.payload.playerId) ?? {
        type: "wallet:updated",
        payload: { playerId: event.payload.playerId },
      },
    );
  }
}
