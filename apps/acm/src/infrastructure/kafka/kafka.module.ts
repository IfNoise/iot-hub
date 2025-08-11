import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { KafkaProducer } from './kafka.producer.js';
import { KeycloakEventConsumer } from './keycloak-event.consumer.js';
import { UserModule } from '../../user/user.module.js';
import { AcmModule } from '../../acm/acm.module.js';
import { KeycloakModule } from '../keycloak/keycloak.module.js';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AcmModule),
    KeycloakModule,
  ],
  providers: [
    {
      provide: KafkaProducer,
      useFactory: (configService: ConfigService) => {
        const kafkaConfig = configService.kafka.getKafkaOptions();
        return new KafkaProducer(kafkaConfig);
      },
      inject: [ConfigService],
    },
    {
      provide: 'KAFKA_CONFIG',
      useFactory: (configService: ConfigService) => {
        return configService.kafka.getKafkaOptions();
      },
      inject: [ConfigService],
    },
    KeycloakEventConsumer,
  ],
  exports: [KafkaProducer, KeycloakEventConsumer],
})
export class KafkaModule {}
