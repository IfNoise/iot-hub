import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from './kafka.service.js';
import type { Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaConsumerService {
  private readonly logger = new Logger(KafkaConsumerService.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async createConsumer(groupId: string): Promise<Consumer> {
    const consumer = this.kafkaService.createConsumer(groupId);
    await consumer.connect();
    this.logger.log(`✅ Consumer connected for group: ${groupId}`);
    return consumer;
  }

  async subscribeToTopics(
    consumer: Consumer,
    topics: string[],
    messageHandler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    try {
      await consumer.subscribe({ topics });

      await consumer.run({
        eachMessage: async (payload) => {
          try {
            this.logger.debug(
              `📨 Received message from topic ${payload.topic}, partition ${payload.partition}`
            );
            await messageHandler(payload);
          } catch (error) {
            this.logger.error(
              `❌ Error processing message from topic ${payload.topic}`,
              error
            );
            throw error;
          }
        },
      });

      this.logger.log(`✅ Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error('❌ Failed to subscribe to topics', error);
      throw error;
    }
  }

  async parseMessage<T>(payload: EachMessagePayload): Promise<T | null> {
    try {
      if (!payload.message.value) {
        return null;
      }

      const messageString = payload.message.value.toString();
      return JSON.parse(messageString) as T;
    } catch (error) {
      this.logger.error('❌ Failed to parse message', error);
      return null;
    }
  }
}
