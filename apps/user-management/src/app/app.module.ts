import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@iot-hub/observability';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { KafkaModule } from '../infrastructure/kafka/kafka.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { KeycloakModule } from '../infrastructure/keycloak/keycloak.module';
import { HealthModule } from '../health/health.module';
import { ConfigModule } from '../config/config.module.js';
import { CommonConfigService } from '../config/common/common-config.service.js';

@Module({
  imports: [
    ConfigModule, // Наша новая система конфигурации
    ObservabilityModule,
    // Pino Logger настройка аналогично backend
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
              errorLikeObjectKeys: ['err'],
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
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                headers: req.headers,
                remoteAddress: req.socket?.remoteAddress,
                remotePort: req.socket?.remotePort,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
                headers: res.headers,
              }),
            },
          },
        };
      },
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
