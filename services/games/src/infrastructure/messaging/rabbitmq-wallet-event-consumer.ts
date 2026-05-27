import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  WALLET_EXCHANGE,
  WALLET_ROUTING_KEYS,
  type WalletEvent,
} from "@crash/contracts";
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { HandleWalletEventUseCase } from "../../application";

const GAME_WALLET_EVENT_QUEUE = "games.wallet-events.v1";

@Injectable()
export class RabbitmqWalletEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqWalletEventConsumer.name);
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(private readonly handleWalletEventUseCase: HandleWalletEventUseCase) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect(getRabbitmqUrl());
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EXCHANGE, "direct", { durable: true });
    await this.channel.assertQueue(GAME_WALLET_EVENT_QUEUE, { durable: true });

    for (const routingKey of [
      WALLET_ROUTING_KEYS.betDebited,
      WALLET_ROUTING_KEYS.betDebitRejected,
      WALLET_ROUTING_KEYS.cashoutCredited,
      WALLET_ROUTING_KEYS.cashoutCreditRejected,
      WALLET_ROUTING_KEYS.betRefunded,
    ]) {
      await this.channel.bindQueue(GAME_WALLET_EVENT_QUEUE, WALLET_EXCHANGE, routingKey);
    }

    await this.channel.prefetch(1);
    await this.channel.consume(GAME_WALLET_EVENT_QUEUE, (message) => {
      void this.handleMessage(message);
    });
    this.logger.log("Wallet event RabbitMQ consumer started");
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch((error) => {
      this.logger.warn(`RabbitMQ channel close failed: ${String(error)}`);
    });
    await this.connection?.close().catch((error) => {
      this.logger.warn(`RabbitMQ connection close failed: ${String(error)}`);
    });
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (message === null || this.channel === undefined) {
      return;
    }

    try {
      const event = JSON.parse(message.content.toString("utf8")) as WalletEvent;
      await this.handleWalletEventUseCase.execute(event);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error("Wallet event handling failed", error);
      this.channel.nack(message, false, true);
    }
  }
}

function getRabbitmqUrl(): string {
  return process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672";
}
