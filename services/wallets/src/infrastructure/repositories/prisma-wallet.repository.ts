import {
  asOperationId,
  asPlayerId,
  makeCents,
  type PlayerId,
} from "@crash/contracts";
import type { WalletRepository } from "../../application";
import {
  Wallet,
  type LedgerEntry,
  type LedgerEntryType,
  type WalletSnapshot,
} from "../../domain";
import { PrismaService } from "../prisma/prisma.service";

export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayerId(playerId: PlayerId): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
      include: { ledger: { orderBy: { occurredAt: "asc" } } },
    });

    if (wallet === null) {
      return null;
    }

    return Wallet.rehydrate({
      playerId: asPlayerId(wallet.playerId),
      balanceCents: makeCents(wallet.balanceCents),
      ledgerEntries: wallet.ledger.map((entry): LedgerEntry => ({
        operationId: asOperationId(entry.operationId),
        type: entry.type as LedgerEntryType,
        amountCents: makeCents(entry.amountCents),
        balanceAfterCents: makeCents(entry.balanceAfterCents),
        occurredAt: entry.occurredAt,
        reason: entry.reason,
      })),
    });
  }

  async save(wallet: Wallet): Promise<void> {
    const snapshot = wallet.toSnapshot();

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { playerId: snapshot.playerId },
        create: {
          playerId: snapshot.playerId,
          balanceCents: snapshot.balanceCents,
        },
        update: {
          balanceCents: snapshot.balanceCents,
        },
      });

      await tx.ledgerEntry.deleteMany({
        where: { playerId: snapshot.playerId },
      });

      if (snapshot.ledgerEntries.length > 0) {
        await tx.ledgerEntry.createMany({
          data: snapshot.ledgerEntries.map((entry) =>
            this.toLedgerRecord(snapshot, entry),
          ),
        });
      }
    });
  }

  private toLedgerRecord(snapshot: WalletSnapshot, entry: LedgerEntry) {
    return {
      operationId: entry.operationId,
      playerId: snapshot.playerId,
      type: entry.type,
      amountCents: entry.amountCents,
      balanceAfterCents: entry.balanceAfterCents,
      occurredAt: entry.occurredAt,
      reason: entry.reason,
    };
  }
}
