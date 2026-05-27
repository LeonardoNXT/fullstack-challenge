import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { WalletCommand } from "@crash/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { RabbitmqWalletCommandPublisher } from "./rabbitmq-wallet-command-publisher";

@Injectable()
export class GamesOutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GamesOutboxPublisherService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: RabbitmqWalletCommandPublisher,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.flush();
    }, getOutboxIntervalMs());
    void this.flush();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
    }
  }

  async flush(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const messages = await this.prisma.outboxMessage.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "asc" },
        take: 25,
      });

      for (const message of messages) {
        try {
          await this.publisher.publish(message.payload as unknown as WalletCommand);
          await this.prisma.outboxMessage.update({
            where: { id: message.id },
            data: { publishedAt: new Date(), attempts: { increment: 1 }, lastError: null },
          });
        } catch (error) {
          await this.prisma.outboxMessage.update({
            where: { id: message.id },
            data: {
              attempts: { increment: 1 },
              lastError: error instanceof Error ? error.message : String(error),
            },
          });
          this.logger.warn(`Games outbox publish failed for ${message.id}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

function getOutboxIntervalMs(): number {
  const parsed = Number(process.env.OUTBOX_PUBLISH_INTERVAL_MS ?? "250");
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 250;
}
