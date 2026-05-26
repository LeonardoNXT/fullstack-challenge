import {
  makeMultiplierBps,
  ONE_X_BPS,
  type BetId,
  type Cents,
  type MultiplierBps,
  type PlayerId,
  type RoundId,
  type RoundPhase,
} from "@crash/contracts";
import { Bet, type BetSnapshot } from "./bet";
import { GameDomainError } from "../errors/game-domain.error";

export const DEFAULT_GROWTH_BPS_PER_SECOND = 1000;

export interface RoundSnapshot {
  readonly roundId: RoundId;
  readonly phase: RoundPhase;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  readonly clientSeed: string;
  readonly nonce: number;
  readonly crashPointBps: MultiplierBps;
  readonly bettingOpenedAt: Date;
  readonly bettingClosesAt: Date;
  readonly startedAt?: Date;
  readonly crashedAt?: Date;
  readonly growthBpsPerSecond: number;
  readonly bets: readonly BetSnapshot[];
}

export class Round {
  private constructor(
    readonly roundId: RoundId,
    private phaseValue: RoundPhase,
    readonly serverSeed: string,
    readonly serverSeedHash: string,
    readonly clientSeed: string,
    readonly nonce: number,
    readonly crashPointBps: MultiplierBps,
    readonly bettingOpenedAt: Date,
    readonly bettingClosesAt: Date,
    private startedAtValue: Date | undefined,
    private crashedAtValue: Date | undefined,
    readonly growthBpsPerSecond: number,
    private readonly betsValue: Bet[],
  ) {}

  static open(input: {
    readonly roundId: RoundId;
    readonly serverSeed: string;
    readonly serverSeedHash: string;
    readonly clientSeed: string;
    readonly nonce: number;
    readonly crashPointBps: MultiplierBps;
    readonly bettingOpenedAt: Date;
    readonly bettingClosesAt: Date;
    readonly growthBpsPerSecond?: number;
  }): Round {
    return new Round(
      input.roundId,
      "betting",
      input.serverSeed,
      input.serverSeedHash,
      input.clientSeed,
      input.nonce,
      input.crashPointBps,
      input.bettingOpenedAt,
      input.bettingClosesAt,
      undefined,
      undefined,
      input.growthBpsPerSecond ?? DEFAULT_GROWTH_BPS_PER_SECOND,
      [],
    );
  }

  static rehydrate(snapshot: RoundSnapshot): Round {
    return new Round(
      snapshot.roundId,
      snapshot.phase,
      snapshot.serverSeed,
      snapshot.serverSeedHash,
      snapshot.clientSeed,
      snapshot.nonce,
      snapshot.crashPointBps,
      snapshot.bettingOpenedAt,
      snapshot.bettingClosesAt,
      snapshot.startedAt,
      snapshot.crashedAt,
      snapshot.growthBpsPerSecond,
      snapshot.bets.map((bet) => Bet.rehydrate(bet)),
    );
  }

  get phase(): RoundPhase {
    return this.phaseValue;
  }

  get startedAt(): Date | undefined {
    return this.startedAtValue;
  }

  get crashedAt(): Date | undefined {
    return this.crashedAtValue;
  }

  get bets(): readonly Bet[] {
    return [...this.betsValue];
  }

  placeBet(input: {
    readonly betId: BetId;
    readonly playerId: PlayerId;
    readonly username: string;
    readonly amountCents: Cents;
    readonly placedAt: Date;
    readonly autoCashoutMultiplierBps?: MultiplierBps;
  }): Bet {
    if (this.phaseValue !== "betting") {
      throw new GameDomainError("ROUND_NOT_BETTING");
    }

    if (this.betsValue.some((bet) => bet.playerId === input.playerId)) {
      throw new GameDomainError("DUPLICATE_BET");
    }

    const bet = Bet.place({
      ...input,
      roundId: this.roundId,
    });
    this.betsValue.push(bet);

    return bet;
  }

  acceptBet(betId: BetId): void {
    this.findBet(betId).accept();
  }

  rejectBet(betId: BetId, reason: string, settledAt: Date): void {
    this.findBet(betId).reject(reason, settledAt);
  }

  start(startedAt: Date): void {
    if (this.phaseValue !== "betting") {
      throw new GameDomainError("INVALID_ROUND_TRANSITION");
    }

    this.phaseValue = "running";
    this.startedAtValue = startedAt;
  }

  currentMultiplierAt(now: Date): MultiplierBps {
    if (this.phaseValue === "betting" || this.startedAtValue === undefined) {
      return ONE_X_BPS;
    }

    if (this.phaseValue === "crashed" || this.phaseValue === "settled") {
      return this.crashPointBps;
    }

    const elapsedMs = Math.max(0, now.getTime() - this.startedAtValue.getTime());
    const currentBps =
      Number(ONE_X_BPS) +
      Math.floor((elapsedMs * this.growthBpsPerSecond) / 1000);

    return makeMultiplierBps(Math.min(currentBps, this.crashPointBps));
  }

  cashOut(playerId: PlayerId, now: Date): { readonly bet: Bet; readonly payoutCents: Cents } {
    if (this.phaseValue !== "running") {
      throw new GameDomainError("ROUND_NOT_RUNNING");
    }

    const currentMultiplierBps = this.currentMultiplierAt(now);
    if (currentMultiplierBps >= this.crashPointBps) {
      throw new GameDomainError("ROUND_ALREADY_CRASHED");
    }

    const bet = this.betsValue.find((candidate) => candidate.playerId === playerId);
    if (bet === undefined) {
      throw new GameDomainError("BET_NOT_FOUND");
    }

    return {
      bet,
      payoutCents: bet.cashOut(currentMultiplierBps, now),
    };
  }

  applyAutoCashouts(now: Date): readonly Bet[] {
    if (this.phaseValue !== "running") {
      return [];
    }

    const currentMultiplierBps = this.currentMultiplierAt(now);
    if (currentMultiplierBps >= this.crashPointBps) {
      return [];
    }

    const cashedOut: Bet[] = [];
    for (const bet of this.betsValue) {
      if (
        bet.status === "accepted" &&
        bet.autoCashoutMultiplierBps !== undefined &&
        bet.autoCashoutMultiplierBps <= currentMultiplierBps
      ) {
        bet.cashOut(bet.autoCashoutMultiplierBps, now);
        cashedOut.push(bet);
      }
    }

    return cashedOut;
  }

  crash(crashedAt: Date): readonly Bet[] {
    if (this.phaseValue !== "running") {
      throw new GameDomainError("ROUND_NOT_RUNNING");
    }

    this.phaseValue = "crashed";
    this.crashedAtValue = crashedAt;

    const lostBets: Bet[] = [];
    for (const bet of this.betsValue) {
      const previousStatus = bet.status;
      bet.lose(crashedAt);

      if (previousStatus === "accepted" && bet.status === "lost") {
        lostBets.push(bet);
      }
    }

    return lostBets;
  }

  settle(): void {
    if (this.phaseValue !== "crashed") {
      throw new GameDomainError("INVALID_ROUND_TRANSITION");
    }

    this.phaseValue = "settled";
  }

  toSnapshot(): RoundSnapshot {
    return {
      roundId: this.roundId,
      phase: this.phaseValue,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      crashPointBps: this.crashPointBps,
      bettingOpenedAt: this.bettingOpenedAt,
      bettingClosesAt: this.bettingClosesAt,
      startedAt: this.startedAtValue,
      crashedAt: this.crashedAtValue,
      growthBpsPerSecond: this.growthBpsPerSecond,
      bets: this.betsValue.map((bet) => bet.toSnapshot()),
    };
  }

  private findBet(betId: BetId): Bet {
    const bet = this.betsValue.find((candidate) => candidate.betId === betId);
    if (bet === undefined) {
      throw new GameDomainError("BET_NOT_FOUND");
    }

    return bet;
  }
}
