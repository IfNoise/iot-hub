import { Injectable } from '@nestjs/common';
import { kafkaConfigSchema, KafkaConfig } from './kafka-config.schema.js';

@Injectable()
export class KafkaConfigService {
  private readonly config: KafkaConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = kafkaConfigSchema.parse({
      enabled: env.KAFKA_ENABLED,
      brokers: env.KAFKA_BROKERS,
      clientId: env.KAFKA_CLIENT_ID,
      groupId: env.KAFKA_GROUP_ID,
      // Остальные параметры используют значения по умолчанию из схемы
    });
  }

  get<T extends keyof KafkaConfig>(key: T): KafkaConfig[T] {
    return this.config[key];
  }

  getAll(): KafkaConfig {
    return this.config;
  }

  // Kafka connection options
  getKafkaOptions() {
    return {
      clientId: this.config.clientId,
      brokers: this.getBrokers(),
      ssl: this.config.ssl,
      sasl: this.config.sasl,
      connectionTimeout: this.config.connectionTimeout,
      requestTimeout: this.config.requestTimeout,
      retry: this.config.retry,
    };
  }

  // Consumer configuration
  getConsumerConfig() {
    return {
      groupId: this.config.groupId,
      ...this.config.consumer,
    };
  }

  // Producer configuration
  getProducerConfig() {
    return {
      ...this.config.producer,
    };
  }

  // Parse brokers string to array
  getBrokers(): string[] {
    return this.config.brokers.split(',').map((broker) => broker.trim());
  }

  // Feature checks
  isEnabled(): boolean {
    return this.config.enabled;
  }

  isSSLEnabled(): boolean {
    return this.config.ssl;
  }

  isSASLEnabled(): boolean {
    return !!this.config.sasl?.mechanism;
  }
}
