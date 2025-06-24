import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '../database/database.module';
import { CryptoModule } from '../crypto/crypto.module';
import { DevicesModule } from '../devices/devices.module';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from '../auth/auth.module';
import { MiddlewareModule } from '../common/middleware/middleware.module';
import { KeycloakOAuth2Middleware } from '../common/middleware/keycloak-oauth2.middleware';
import { AutoUserSyncMiddleware } from '../common/middleware/auto-user-sync.middleware';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { CommonServicesModule } from '../common/services/common-services.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    DatabaseModule,
    CryptoModule,
    DevicesModule,
    UsersModule,
    AuthModule,
    MiddlewareModule,
    ConfigModule,
    CommonServicesModule,
    MqttModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          ...configService.getLoggingConfig(),
          transport: {
            target: 'pino-loki',
            options: {
              host: 'http://localhost:3100',
              json: true,
              batch: true,
              labels: { app: 'nestjs-loki-grafana' },
            },
          },
          autoLogging: true,
          redact: ['req.headers.authorization'],
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Включаем middleware Keycloak с исключениями для публичных маршрутов
    consumer
      .apply(KeycloakOAuth2Middleware)
      .exclude(
        '/api',
        '/api/health',
        '/api/health/*',
        '/api/status',
        '/api/metrics',
        '/api/metrics/*'
      )
      .forRoutes('*');

    // Включаем middleware автоматической синхронизации пользователей
    // Применяется после Keycloak middleware для всех защищенных маршрутов
    consumer
      .apply(AutoUserSyncMiddleware)
      .exclude(
        '/api',
        '/api/health',
        '/api/health/*',
        '/api/status',
        '/api/metrics',
        '/api/metrics/*'
      )
      .forRoutes('*');
  }
}
