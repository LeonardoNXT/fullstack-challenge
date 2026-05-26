import {
  isValidBetAmount,
  multiplyCentsByBps,
  ONE_X_BPS,
  type BetId,
  type BetStatus,
  type Cents,
  type MultiplierBps,
  type PlayerId,
  type RoundId,
} from "@crash/contracts";
import { GameDomainError } from "../errors/game-domain.error";

export interface BetSnapshot {
  readonly betId: BetId;
  readonly roundId: RoundId;
  readonly playerId: PlayerId;
  readonly username: string;
  readonly amountCents: Cents;
  readonly status: BetStatus;
  readonly autoCashoutMultiplierBps?: MultiplierBps;
  readonly cashoutMultiplierBps?: MultiplierBps;
  readonly payoutCents?: Cents;
  readonly placedAt: Date;
  readonly settledAt?: Date;
  readonly rejectionReason?: string;
}

export class Bet {
  private constructor(
    readonly betId: BetId,
    readonly roundId: RoundId,
    readonly playerId: PlayerId,
    readonly username: string,
    readonly amountCents: Cents,
    private statusValue: BetStatus,
    private readonly placedAtValue: Date,
    private readonly autoCashoutMultiplierBpsValue?: MultiplierBps,
    private cashoutMultiplierBpsValue?: MultiplierBps,
    private payoutCentsValue?: Cents,
    private settledAtValue?: Date,
    private rejectionReasonValue?: string,
  ) {}

  static place(input: {
    readonly betId: BetId;
    readonly roundId: RoundId;
    readonly playerId: PlayerId;
    readonly username: string;
    readonly amountCents: Cents;
    readonly placedAt: Date;
    readonly autoCashoutMultiplierBps?: MultiplierBps;
  }): Bet {
    if (!isValidBetAmount(input.amountCents)) {
      throw new GameDomainError("INVALID_BET_AMOUNT");
    }

    if (
      input.autoCashoutMultiplierBps !== undefined &&
      input.autoCashoutMultiplierBps < ONE_X_BPS
    ) {
      throw new GameDomainError("INVALID_AUTO_CASHOUT_MULTIPLIER");
    }

    return new Bet(
      input.betId,
      input.roundId,
      input.playerId,
      input.username,
      input.amountCents,
      "pending",
      input.placedAt,
      input.autoCashoutMultiplierBps,
    );
  }

  static rehydrate(snapshot: BetSnapshot): Bet {
    return new Bet(
      snapshot.betId,
      snapshot.roundId,
      snapshot.playerId,
      snapshot.username,
      snapshot.amountCents,
      snapshot.status,
      snapshot.placedAt,
      snapshot.autoCashoutMultiplierBps,
      snapshot.cashoutMultiplierBps,
      snapshot.payoutCents,
      snapshot.settledAt,
      snapshot.rejectionReason,
    );
  }

  get status(): BetStatus {
    return this.statusValue;
  }

  get autoCashoutMultiplierBps(): MultiplierBps | undefined {
    return this.autoCashoutMultiplierBpsValue;
  }

  get payoutCents(): Cents | undefined {
    return this.payoutCentsValue;
  }

  accept(): void {
    if (this.statusValue !== "pending") {
      throw new GameDomainError("BET_ALREADY_SETTLED");
    }

    this.statusValue = "accepted";
  }

  reject(reason: string, settledAt: Date): void {
    if (this.statusValue !== "pending") {
      throw new GameDomainError("BET_ALREADY_SETTLED");
    }

    this.statusValue = "rejected";
    this.rejectionReasonValue = reason;
    this.settledAtValue = settledAt;
  }

  cashOut(multiplierBps: MultiplierBps, settledAt: Date): Cents {
    if (this.statusValue !== "accepted") {
      throw new GameDomainError("BET_NOT_ACCEPTED");
    }

    this.statusValue = "cashed_out";
    this.cashoutMultiplierBpsValue = multiplierBps;
    this.payoutCentsValue = multiplyCentsByBps(this.amountCents, multiplierBps);
    this.settledAtValue = settledAt;

    return this.payoutCentsValue;
  }

  lose(settledAt: Date): void {
    if (this.statusValue === "cashed_out" || this.statusValue === "lost") {
      return;
    }

    if (this.statusValue !== "accepted") {
      return;
    }

    this.statusValue = "lost";
    this.settledAtValue = settledAt;
  }

  toSnapshot(): BetSnapshot {
    return {
      betId: this.betId,
      roundId: this.roundId,
      playerId: this.playerId,
      username: this.username,
      amountCents: this.amountCents,
      status: this.statusValue,
      autoCashoutMultiplierBps: this.autoCashoutMultiplierBpsValue,
      cashoutMultiplierBps: this.cashoutMultiplierBpsValue,
      payoutCents: this.payoutCentsValue,
      placedAt: this.placedAtValue,
      settledAt: this.settledAtValue,
      rejectionReason: this.rejectionReasonValue,
    };
  }
}
