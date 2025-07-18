import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { DevicesModule } from '../devices/devices.module.js';
import { UsersModule } from '../users/users.module.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from '../auth/auth.module.js';
import { MiddlewareModule } from '../common/middleware/middleware.module.js';
import { KeycloakOAuth2Middleware } from '../common/middleware/keycloak-oauth2.middleware.js';
import { AutoUserSyncMiddleware } from '../common/middleware/auto-user-sync.middleware.js';
import { ConfigModule } from '../config/config.module.js';
import { CommonServicesModule } from '../common/services/common-services.module.js';
import { MqttModule } from '../mqtt/mqtt.module.js';
import { CommonConfigService } from '../common/config/common-config.service.js';

@Module({
  imports: [
    ConfigModule, // Сначала ConfigModule для предоставления конфигурационных сервисов
    DatabaseModule,
    DevicesModule,
    UsersModule,
    OrganizationsModule,
    AuthModule,
    MiddlewareModule,
    CommonServicesModule,
    MqttModule,
    // Улучшенное логирование с множественными транспортами через CommonConfigService
    LoggerModule.forRootAsync({
      inject: [CommonConfigService],
      useFactory: (commonConfig: CommonConfigService) => {
        const loggingConfig = commonConfig.getLoggingConfig();
        const lokiConfig = commonConfig.getLokiConfig();

        // Формируем targets для множественного логирования
        interface PinoTarget {
          target: string;
          level?: string;
          options?: Record<string, unknown>;
        }

        const targets: PinoTarget[] = [
          // 1. Консольный вывод с красивым форматированием
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
              messageFormat: '{msg} - {err.name}: {err.message}',
              errorLikeObjectKeys: ['err'], // <--- ключевой момент
            },
          },
        ];

        // 2. Файловое логирование (если включено)
        if (
          loggingConfig.toFile &&
          (commonConfig.isProduction() || loggingConfig.enableFileLoggingInDev)
        ) {
          targets.push({
            target: 'pino-roll',
            level: loggingConfig.level,
            options: {
              file: loggingConfig.filePath,
              frequency: 'daily',
              size: loggingConfig.fileMaxSize,
              mkdir: true,
            },
          });
        }

        // 3. Loki логирование (если включено и настроено)
        if (lokiConfig.enabled && lokiConfig.url) {
          targets.push({
            target: 'pino-loki',
            level: loggingConfig.level,
            options: {
              host: lokiConfig.url,
              labels: lokiConfig.labels,
              timeout: lokiConfig.timeout,
              silenceErrors: lokiConfig.silenceErrors,
            },
          });
        }

        return {
          pinoHttp: {
            level: loggingConfig.level,
            transport: { targets },
            autoLogging: loggingConfig.enableRequestLogging,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                userAgent: req.headers['user-agent'],
                ip: req.ip || req.connection?.remoteAddress,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
                responseTime: res.responseTime,
              }),
            },
          },
        };
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
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'metrics/*path', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/*path', method: RequestMethod.ALL },
        { path: 'manufacturing', method: RequestMethod.ALL },
        { path: 'manufacturing/*path', method: RequestMethod.ALL },
        { path: 'devices/certificates', method: RequestMethod.ALL },
        { path: 'devices/certificates/*', method: RequestMethod.ALL }
      )
      .forRoutes('*');

    // Включаем middleware автоматической синхронизации пользователей
    // Применяется после Keycloak middleware для всех защищенных маршрутов
    consumer
      .apply(AutoUserSyncMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'metrics/*path', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/*path', method: RequestMethod.ALL },
        { path: 'manufacturing', method: RequestMethod.ALL },
        { path: 'manufacturing/*path', method: RequestMethod.ALL },
        { path: 'devices/certificates', method: RequestMethod.ALL },
        { path: 'devices/certificates/*path', method: RequestMethod.ALL }
      )
      .forRoutes('*');
  }
}
