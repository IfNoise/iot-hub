import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service.js';
import { KafkaHealthIndicator } from './kafka-health.indicator.js';
import { KafkaConsumerService } from './kafka-consumer.service.js';
import { KafkaProducerService } from './kafka-producer.service.js';
import { DeviceEventService } from './device-event.service.js';
import { DeviceEventConsumer } from './device-event.consumer.js';

@Module({
  imports: [ConfigModule],
  providers: [
    KafkaService,
    KafkaHealthIndicator,
    KafkaConsumerService,
    KafkaProducerService,
    DeviceEventService,
    DeviceEventConsumer,
  ],
  exports: [
    KafkaService,
    KafkaHealthIndicator,
    KafkaConsumerService,
    KafkaProducerService,
    DeviceEventService,
    DeviceEventConsumer,
  ],
})
export class KafkaModule {}
