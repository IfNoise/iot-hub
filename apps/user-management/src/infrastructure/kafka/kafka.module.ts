import { Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { KafkaProducer } from './kafka.producer';

@Module({
  providers: [
    {
      provide: KafkaProducer,
      useFactory: (configService: ConfigService) => {
        const kafkaConfig = configService.kafka.getKafkaOptions();
        return new KafkaProducer(kafkaConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [KafkaProducer],
})
export class KafkaModule {}
