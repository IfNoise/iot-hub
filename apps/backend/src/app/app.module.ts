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
    // Упрощенное логирование
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
          },
        },
        autoLogging: true,
        redact: ['req.headers.authorization'],
      },
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
      .exclude('/health/*path', '/metrics/*path', '/docs/*path')
      .forRoutes('*');

    // Включаем middleware автоматической синхронизации пользователей
    // Применяется после Keycloak middleware для всех защищенных маршрутов
    consumer
      .apply(AutoUserSyncMiddleware)
      .exclude('/health/*path', '/metrics/*path', '/docs/*path')
      .forRoutes('*');
  }
}
