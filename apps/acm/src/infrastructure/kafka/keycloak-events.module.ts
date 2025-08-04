import { Module } from '@nestjs/common';
import { KeycloakEventConsumer } from './keycloak-event.consumer.js';
import { AcmModule } from '../../acm/acm.module.js';
import { KafkaModule } from './kafka.module.js';

@Module({
  imports: [AcmModule, KafkaModule],
  providers: [KeycloakEventConsumer],
  exports: [KeycloakEventConsumer],
})
export class KeycloakEventsModule {}
