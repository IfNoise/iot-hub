import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka.module.js';
import { KafkaTestController } from './kafka-test.controller.js';

@Module({
  imports: [KafkaModule],
  controllers: [KafkaTestController],
})
export class KafkaTestModule {}
