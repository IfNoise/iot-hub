import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { KafkaModule } from '../infrastructure/kafka/kafka.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { KeycloakModule } from '../infrastructure/keycloak/keycloak.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
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
