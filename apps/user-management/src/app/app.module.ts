import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@iot-hub/observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { KafkaModule } from '../infrastructure/kafka/kafka.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { KeycloakModule } from '../infrastructure/keycloak/keycloak.module';
import { HealthModule } from '../health/health.module';
import { ConfigModule } from '../config/config.module.js';

@Module({
  imports: [
    ConfigModule, // Наша новая система конфигурации
    ObservabilityModule,
    DatabaseModule,
    KeycloakModule,
    UserModule,
    KafkaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
