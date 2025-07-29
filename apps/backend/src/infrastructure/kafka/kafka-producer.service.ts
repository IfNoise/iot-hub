import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from './kafka.service.js';
import type { Message } from 'kafkajs';

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async sendMessage(topic: string, message: Message): Promise<void> {
    try {
      const producer = this.kafkaService.getProducer();
      await producer.send({
        topic,
        messages: [message],
      });
      this.logger.debug(`✅ Message sent to topic ${topic}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send message to topic ${topic}`, error);
      throw error;
    }
  }

  async sendEvent<T>(topic: string, key: string, data: T): Promise<void> {
    const message: Message = {
      key,
      value: JSON.stringify(data),
      timestamp: Date.now().toString(),
    };

    await this.sendMessage(topic, message);
  }
}
