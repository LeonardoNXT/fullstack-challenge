import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import {
  WALLET_EXCHANGE,
  type WalletCommand,
} from "@crash/contracts";
import { connect, type Channel, type ChannelModel } from "amqplib";
import type { WalletCommandPublisher } from "../../application";

@Injectable()
export class RabbitmqWalletCommandPublisher
  implements WalletCommandPublisher, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitmqWalletCommandPublisher.name);
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  async publish(command: WalletCommand): Promise<void> {
    const channel = await this.getChannel();
    channel.publish(
      WALLET_EXCHANGE,
      command.type,
      Buffer.from(JSON.stringify(command)),
      {
        contentType: "application/json",
        deliveryMode: 2,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch((error) => {
      this.logger.warn(`RabbitMQ channel close failed: ${String(error)}`);
    });
    await this.connection?.close().catch((error) => {
      this.logger.warn(`RabbitMQ connection close failed: ${String(error)}`);
    });
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel !== undefined) {
      return this.channel;
    }

    this.connection = await connect(getRabbitmqUrl());
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EXCHANGE, "direct", { durable: true });
    return this.channel;
  }
}

function getRabbitmqUrl(): string {
  return process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672";
}
