import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducer } from './kafka.producer';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KafkaProducer,
      useFactory: (configService: ConfigService) => {
        return new KafkaProducer({
          clientId: 'user-management-service',
          brokers: [configService.get('KAFKA_BROKER', 'localhost:9092')],
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [KafkaProducer],
})
export class KafkaModule {}
