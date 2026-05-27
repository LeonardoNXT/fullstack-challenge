import { Injectable } from "@nestjs/common";
import type { EventId } from "@crash/contracts";
import type { ProcessedWalletEventStore } from "../../application";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaProcessedWalletEventStore implements ProcessedWalletEventStore {
  constructor(private readonly prisma: PrismaService) {}

  async has(eventId: EventId): Promise<boolean> {
    const existing = await this.prisma.processedWalletEvent.findUnique({
      where: { eventId },
      select: { eventId: true },
    });

    return existing !== null;
  }

  async record(eventId: EventId): Promise<void> {
    await this.prisma.processedWalletEvent.create({
      data: {
        eventId,
        eventType: "wallet.event",
        payload: {},
      },
    }).catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        return;
      }

      throw error;
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
