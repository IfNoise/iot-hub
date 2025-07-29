import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { KafkaService } from './kafka.service.js';

@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  constructor(private readonly kafkaService: KafkaService) {
    super();
  }

  async isHealthy(key: string = 'kafka'): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.kafkaService.isHealthy();

      if (isHealthy) {
        return this.getStatus(key, true, {
          status: 'up',
          message: 'Kafka is available',
        });
      } else {
        throw new HealthCheckError('Kafka check failed', {
          status: 'down',
          message: 'Kafka is not available',
        });
      }
    } catch (error) {
      throw new HealthCheckError('Kafka check failed', {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
