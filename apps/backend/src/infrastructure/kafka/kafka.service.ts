import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { KafkaTopics } from '@iot-hub/contracts-kafka';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;
  private consumers: Map<string, Consumer> = new Map();

  constructor(private readonly configService: ConfigService) {
    // Пытаемся получить brokers разными способами для обратной совместимости
    const kafkaBrokerUrl = this.configService.get<string>('KAFKA_BROKER_URL');
    const brokers = kafkaBrokerUrl
      ? [kafkaBrokerUrl]
      : this.configService.get<string[]>('kafka.brokers') || ['kafka:9092'];

    const clientId =
      this.configService.get<string>('KAFKA_CLIENT_ID') ||
      this.configService.get<string>('kafka.clientId') ||
      'iot-hub-backend';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.admin.connect();

      // Создаем все топики из контрактов
      await this.createDefaultTopics();

      this.logger.log('✅ Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka service', error);
      throw error;
    }
  }

  private async createDefaultTopics(): Promise<void> {
    const topics = Object.values(KafkaTopics);
    await this.createTopics(topics);
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.admin.disconnect();

      for (const [groupId, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
        this.logger.log(`Disconnected consumer for group: ${groupId}`);
      }

      this.logger.log('✅ Kafka service destroyed successfully');
    } catch (error) {
      this.logger.error('❌ Error during Kafka service destruction', error);
    }
  }

  getProducer(): Producer {
    return this.producer;
  }

  getAdmin(): Admin {
    return this.admin;
  }

  createConsumer(groupId: string): Consumer {
    if (this.consumers.has(groupId)) {
      return this.consumers.get(groupId)!;
    }

    const consumer = this.kafka.consumer({ groupId });
    this.consumers.set(groupId, consumer);
    return consumer;
  }

  async createTopics(topics: string[]): Promise<void> {
    try {
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = topics.filter(
        (topic) => !existingTopics.includes(topic)
      );

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map((topic) => ({
            topic,
            numPartitions: 3,
            replicationFactor: 1,
          })),
        });
        this.logger.log(`✅ Created topics: ${topicsToCreate.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to create topics', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const metadata = await this.admin.fetchTopicMetadata();
      return metadata !== undefined;
    } catch (error) {
      this.logger.error('❌ Kafka health check failed', error);
      return false;
    }
  }
}
