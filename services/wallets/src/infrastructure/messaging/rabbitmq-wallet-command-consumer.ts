import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  WALLET_EXCHANGE,
  WALLET_ROUTING_KEYS,
  type WalletCommand,
} from "@crash/contracts";
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { HandleWalletCommandUseCase } from "../../application";

const WALLET_COMMAND_QUEUE = "wallets.commands.v1";

@Injectable()
export class RabbitmqWalletCommandConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqWalletCommandConsumer.name);
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(private readonly handleWalletCommandUseCase: HandleWalletCommandUseCase) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect(getRabbitmqUrl());
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EXCHANGE, "direct", { durable: true });
    await this.channel.assertQueue(WALLET_COMMAND_QUEUE, { durable: true });

    for (const routingKey of [
      WALLET_ROUTING_KEYS.betDebitRequested,
      WALLET_ROUTING_KEYS.cashoutCreditRequested,
      WALLET_ROUTING_KEYS.betRefundRequested,
    ]) {
      await this.channel.bindQueue(WALLET_COMMAND_QUEUE, WALLET_EXCHANGE, routingKey);
    }

    await this.channel.prefetch(1);
    await this.channel.consume(WALLET_COMMAND_QUEUE, (message) => {
      void this.handleMessage(message);
    });
    this.logger.log("Wallet command RabbitMQ consumer started");
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
      const command = JSON.parse(message.content.toString("utf8")) as WalletCommand;
      await this.handleWalletCommandUseCase.execute(command);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error("Wallet command handling failed", error);
      this.channel.nack(message, false, true);
    }
  }
}

function getRabbitmqUrl(): string {
  return process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672";
}
