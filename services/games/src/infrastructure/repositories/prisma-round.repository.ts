import {
  WALLET_ROUTING_KEYS,
  asBetId,
  asPlayerId,
  asRoundId,
  makeCents,
  makeMultiplierBps,
  type BetStatus,
  type PlayerId,
  type RoundId,
  type RoundPhase,
  type WalletCommand,
  type WalletEvent,
} from "@crash/contracts";
import { GameApplicationError, type RoundRepository } from "../../application";
import { Round, type BetSnapshot, type RoundSnapshot } from "../../domain";
import type { Prisma } from "../prisma/generated";
import { PrismaService } from "../prisma/prisma.service";

type RoundRecord = Awaited<ReturnType<PrismaService["round"]["findUnique"]>>;
type RoundWithBets = NonNullable<RoundRecord> & {
  bets: Array<{
    betId: string;
    roundId: string;
    playerId: string;
    username: string;
    amountCents: number;
    status: string;
    autoCashoutMultiplierBps: number | null;
    cashoutMultiplierBps: number | null;
    payoutCents: number | null;
    placedAt: Date;
    settledAt: Date | null;
    rejectionReason: string | null;
  }>;
};

export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: { phase: { in: ["betting", "running", "crashed"] } },
      orderBy: { bettingOpenedAt: "desc" },
      include: { bets: { orderBy: { placedAt: "asc" } } },
    });

    return round === null ? null : Round.rehydrate(this.toRoundSnapshot(round));
  }

  async findById(roundId: RoundId): Promise<Round | null> {
    const round = await this.prisma.round.findUnique({
      where: { roundId },
      include: { bets: { orderBy: { placedAt: "asc" } } },
    });

    return round === null ? null : Round.rehydrate(this.toRoundSnapshot(round));
  }

  async findRecentSettled(limit: number): Promise<readonly Round[]> {
    const rounds = await this.prisma.round.findMany({
      where: { phase: "settled" },
      orderBy: { bettingOpenedAt: "desc" },
      take: limit,
      include: { bets: { orderBy: { placedAt: "asc" } } },
    });

    return rounds.map((round) => Round.rehydrate(this.toRoundSnapshot(round)));
  }

  async findBetsByPlayerId(
    playerId: PlayerId,
    limit: number,
  ): Promise<readonly BetSnapshot[]> {
    const bets = await this.prisma.bet.findMany({
      where: { playerId },
      orderBy: { placedAt: "desc" },
      take: limit,
    });

    return bets.map((bet) => this.toBetSnapshot(bet));
  }

  async findAllBets(limit: number): Promise<readonly BetSnapshot[]> {
    const bets = await this.prisma.bet.findMany({
      orderBy: { placedAt: "desc" },
      take: limit,
    });

    return bets.map((bet) => this.toBetSnapshot(bet));
  }

  async findBetsSince(since: Date, limit: number): Promise<readonly BetSnapshot[]> {
    const bets = await this.prisma.bet.findMany({
      where: { placedAt: { gte: since } },
      orderBy: { placedAt: "desc" },
      take: limit,
    });

    return bets.map((bet) => this.toBetSnapshot(bet));
  }

  async save(round: Round): Promise<void> {
    await this.saveWithOutbox(round, []);
  }

  async saveWithOutbox(round: Round, commands: readonly WalletCommand[]): Promise<void> {
    const snapshot = round.toSnapshot();

    await this.prisma.$transaction(async (tx) => {
      await this.persistRoundSnapshot(tx, snapshot);

      if (commands.length > 0) {
        await tx.outboxMessage.createMany({
          data: commands.map((command) => ({
            id: command.eventId,
            type: command.type,
            payload: command as never,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  async processWalletEventWithInbox(
    event: WalletEvent,
    now: Date,
  ): Promise<{ readonly handled: boolean; readonly duplicate: boolean; readonly bet?: BetSnapshot }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.processedWalletEvent.findUnique({
        where: { eventId: event.eventId },
        select: { eventId: true },
      });
      if (existing !== null) {
        return { handled: false, duplicate: true };
      }

      if (
        event.type === WALLET_ROUTING_KEYS.cashoutCredited ||
        event.type === WALLET_ROUTING_KEYS.cashoutCreditRejected ||
        event.type === WALLET_ROUTING_KEYS.betRefunded
      ) {
        await this.recordProcessedWalletEvent(tx, event);
        return { handled: true, duplicate: false };
      }

      const roundRecord = await tx.round.findUnique({
        where: { roundId: event.payload.roundId },
        include: { bets: { orderBy: { placedAt: "asc" } } },
      });
      if (roundRecord === null) {
        throw new GameApplicationError("ROUND_NOT_FOUND");
      }

      const round = Round.rehydrate(this.toRoundSnapshot(roundRecord));
      const existingBet = round.bets.find((bet) => bet.betId === event.payload.betId);
      const bet =
        event.type === WALLET_ROUTING_KEYS.betDebited
          ? existingBet?.status === "accepted"
            ? existingBet
            : round.acceptBet(event.payload.betId)
          : existingBet?.status === "rejected"
            ? existingBet
            : round.rejectBet(event.payload.betId, event.payload.reason, now);

      await this.persistRoundSnapshot(tx, round.toSnapshot());
      await this.recordProcessedWalletEvent(tx, event);

      return { handled: true, duplicate: false, bet: bet.toSnapshot() };
    });
  }

  private async persistRoundSnapshot(
    tx: Prisma.TransactionClient,
    snapshot: RoundSnapshot,
  ): Promise<void> {
    await tx.round.upsert({
      where: { roundId: snapshot.roundId },
      create: this.toRoundRecord(snapshot),
      update: this.toRoundRecord(snapshot),
    });

    await tx.bet.deleteMany({ where: { roundId: snapshot.roundId } });

    if (snapshot.bets.length > 0) {
      await tx.bet.createMany({
        data: snapshot.bets.map((bet) => this.toBetRecord(bet)),
      });
    }
  }

  private async recordProcessedWalletEvent(
    tx: Prisma.TransactionClient,
    event: WalletEvent,
  ): Promise<void> {
    await tx.processedWalletEvent.create({
      data: {
        eventId: event.eventId,
        eventType: event.type,
        payload: event as never,
      },
    });
  }

  private toRoundSnapshot(round: RoundWithBets): RoundSnapshot {
    return {
      roundId: asRoundId(round.roundId),
      phase: round.phase as RoundPhase,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: Number(round.nonce),
      crashPointBps: makeMultiplierBps(round.crashPointBps),
      bettingOpenedAt: round.bettingOpenedAt,
      bettingClosesAt: round.bettingClosesAt,
      startedAt: round.startedAt ?? undefined,
      crashedAt: round.crashedAt ?? undefined,
      growthBpsPerSecond: round.growthBpsPerSecond,
      bets: round.bets.map((bet) => this.toBetSnapshot(bet)),
    };
  }

  private toBetSnapshot(bet: RoundWithBets["bets"][number]): BetSnapshot {
    return {
      betId: asBetId(bet.betId),
      roundId: asRoundId(bet.roundId),
      playerId: asPlayerId(bet.playerId),
      username: bet.username,
      amountCents: makeCents(bet.amountCents),
      status: bet.status as BetStatus,
      autoCashoutMultiplierBps:
        bet.autoCashoutMultiplierBps === null
          ? undefined
          : makeMultiplierBps(bet.autoCashoutMultiplierBps),
      cashoutMultiplierBps:
        bet.cashoutMultiplierBps === null
          ? undefined
          : makeMultiplierBps(bet.cashoutMultiplierBps),
      payoutCents: bet.payoutCents === null ? undefined : makeCents(bet.payoutCents),
      placedAt: bet.placedAt,
      settledAt: bet.settledAt ?? undefined,
      rejectionReason: bet.rejectionReason ?? undefined,
    };
  }

  private toRoundRecord(snapshot: RoundSnapshot) {
    return {
      roundId: snapshot.roundId,
      phase: snapshot.phase,
      serverSeed: snapshot.serverSeed,
      serverSeedHash: snapshot.serverSeedHash,
      clientSeed: snapshot.clientSeed,
      nonce: String(snapshot.nonce),
      crashPointBps: snapshot.crashPointBps,
      bettingOpenedAt: snapshot.bettingOpenedAt,
      bettingClosesAt: snapshot.bettingClosesAt,
      startedAt: snapshot.startedAt,
      crashedAt: snapshot.crashedAt,
      growthBpsPerSecond: snapshot.growthBpsPerSecond,
    };
  }

  private toBetRecord(bet: BetSnapshot) {
    return {
      betId: bet.betId,
      roundId: bet.roundId,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents,
      status: bet.status,
      autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
      cashoutMultiplierBps: bet.cashoutMultiplierBps,
      payoutCents: bet.payoutCents,
      placedAt: bet.placedAt,
      settledAt: bet.settledAt,
      rejectionReason: bet.rejectionReason,
    };
  }
}
