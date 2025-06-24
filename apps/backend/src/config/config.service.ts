import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { envConfigSchema } from './config.schema';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { LogRequest, LogResponse } from '../common/types/logging.types';
import type { OpenTelemetryConfig } from '../common/observability/config.types';

// Импортируем ваши сущности
import { Device } from '../devices/entities/device.entity';
import { Certificate } from '../devices/entities/certificate.entity';
import { User } from '../users/entities/user.entity';

// Импортируем enum из database-config.schema для согласованности типов БД
import { DatabaseTypeEnum as AppDatabaseTypeEnumZod } from '../database/config/database-config.schema';

// Создаем тип на основе Zod enum для использования в TypeORM
type AppDatabaseType = z.infer<typeof AppDatabaseTypeEnumZod>;

// Определяем возможные строковые значения для TypeORM logging
type TypeOrmLoggingOption =
  | 'query'
  | 'error'
  | 'schema'
  | 'warn'
  | 'info'
  | 'log'
  | 'migration';

@Injectable()
export class ConfigService {
  private readonly env: z.infer<typeof envConfigSchema>;

  constructor() {
    const parsed = envConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration: ${parsed.error.message}`
      );
    }
    this.env = parsed.data;
  }

  get<T extends keyof z.infer<typeof envConfigSchema>>(
    key: T
  ): z.infer<typeof envConfigSchema>[T] {
    return this.env[key];
  }

  // Environment-aware getters
  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  // Database configuration with environment-specific overrides
  getDatabaseConfig(): TypeOrmModuleOptions {
    const dbTypeFromEnv = this.env.DB_TYPE;
    const isValidDbType = (AppDatabaseTypeEnumZod.options as string[]).includes(
      dbTypeFromEnv
    );
    const validatedDbType: AppDatabaseType = isValidDbType
      ? (dbTypeFromEnv as AppDatabaseType)
      : 'postgres';

    const baseConfig: Partial<TypeOrmModuleOptions> = {
      type: validatedDbType,
      host: this.env.DATABASE_HOST,
      port: this.env.DATABASE_PORT,
      username: this.env.DATABASE_USER,
      password: this.env.DATABASE_PASSWORD,
      database: this.env.DATABASE_NAME,
      entities: [Device, Certificate, User],
      autoLoadEntities: false,
    };

    if (this.isDevelopment()) {
      return {
        ...baseConfig,
        synchronize: true,
        logging: true,
        dropSchema: false,
        cache: false,
        ssl: false,
        extra: {
          connectionTimeoutMillis: 60000,
          idleTimeoutMillis: 60000,
        },
      } as TypeOrmModuleOptions;
    }

    if (this.isProduction()) {
      return {
        ...baseConfig,
        synchronize: false,
        logging: ['error', 'warn'] as TypeOrmLoggingOption[],
        ssl: this.env.DB_SSL,
        extra: {
          ssl: this.env.DB_SSL ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          max: this.env.DB_POOL_SIZE || 20,
          min: 5,
        },
        cache: {
          duration: 30000,
        },
      } as TypeOrmModuleOptions;
    }

    if (this.isTest()) {
      return {
        ...baseConfig,
        synchronize: true,
        logging: false,
        dropSchema: true,
        cache: false,
        ssl: false,
      } as TypeOrmModuleOptions;
    }

    return {
      ...baseConfig,
      synchronize: this.env.DB_SYNCHRONIZE,
      logging: this.parseLogging(this.env.DB_LOGGING),
      dropSchema: this.env.DB_DROP_SCHEMA,
      ssl: this.env.DB_SSL,
      extra: {
        max: this.env.DB_POOL_SIZE,
      },
    } as TypeOrmModuleOptions;
  }

  // CORS configuration
  getCorsConfig() {
    if (this.isDevelopment()) {
      return {
        origin: true,
        credentials: true,
      };
    }

    if (this.isProduction()) {
      const allowedOrigins = this.env.ALLOWED_ORIGINS?.split(',') || [];
      return {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void
        ) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: this.env.CORS_CREDENTIALS,
      };
    }
    return {
      origin: this.env.CORS_ORIGIN === '*' ? true : this.env.CORS_ORIGIN,
      credentials: this.env.CORS_CREDENTIALS,
    };
  }

  // JWT configuration
  getJwtConfig() {
    return {
      secret: this.env.JWT_SECRET,
      expiresIn: this.isProduction() ? '24h' : this.env.JWT_EXPIRATION,
    };
  }

  // Redis configuration
  getRedisConfig() {
    if (this.isTest()) {
      return { enabled: false }; // Отключить Redis для тестов, если не мокается
    }

    return {
      enabled: this.env.REDIS_ENABLED,
      url: this.env.REDIS_URL,
      retryAttempts: this.isProduction() ? 10 : this.env.REDIS_RETRY_ATTEMPTS,
      retryDelay: this.isProduction() ? 3000 : this.env.REDIS_RETRY_DELAY,
      maxRetriesPerRequest: this.isProduction() ? 3 : undefined,
    };
  }

  // Rate limiting configuration
  getRateLimitConfig() {
    return {
      windowMs: this.env.RATE_LIMIT_WINDOW_MS,
      max: this.env.RATE_LIMIT_MAX,
    };
  }

  // Enhanced Logging configuration with error handling
  getLoggingConfig() {
    try {
      // Development configuration
      if (this.isDevelopment()) {
        if (this.env.ENABLE_FILE_LOGGING_IN_DEV) {
          return {
            level: this.env.LOG_LEVEL,
            transport: {
              targets: [
                {
                  target: 'pino-pretty',
                  level: this.env.LOG_LEVEL,
                  options: {
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    colorize: true,
                  },
                },
                {
                  target: 'pino/file',
                  level: this.env.LOG_LEVEL,
                  options: {
                    destination: this.env.LOG_FILE_PATH,
                    mkdir: true,
                    sync: false, // Async for better performance
                  },
                },
              ],
            },
          };
        }

        return {
          level: this.env.LOG_LEVEL,
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              colorize: true,
            },
          },
        };
      }

      // Production configuration with enhanced rotation
      if (this.isProduction()) {
        return {
          level: this.env.LOG_LEVEL || 'info',
          serializers: {
            req: (req: LogRequest) => ({
              method: req.method,
              url: req.url,
              headers: {
                host: req.headers?.host,
                'user-agent': req.headers?.['user-agent'],
                accept: req.headers?.accept,
              },
              remoteAddress: req.remoteAddress,
              remotePort: req.remotePort,
            }),
            res: (res: LogResponse) => ({
              statusCode: res.statusCode,
              headers: {
                'content-type': res.headers?.['content-type'],
                'content-length': res.headers?.['content-length'],
              },
            }),
          },
          transport: {
            target: 'pino-roll',
            options: {
              file: this.env.LOG_FILE_PATH || './logs/production.log',
              frequency: 'daily',
              size: this.env.LOG_FILE_MAX_SIZE || '50M',
              limit: {
                count: this.env.LOG_FILE_MAX_FILES || 10,
              },
              mkdir: true,
            },
          },
        };
      }

      // Test environment - minimal logging
      if (this.isTest()) {
        return {
          level: 'error',
          transport: {
            target: 'pino/file',
            options: {
              destination: './logs/test.log',
              mkdir: true,
            },
          },
        };
      }

      // Fallback configuration
      return {
        level: this.env.LOG_LEVEL,
        transport: {
          target: 'pino/file',
          options: {
            destination: this.env.LOG_FILE_PATH,
            mkdir: true,
          },
        },
      };
    } catch (error: unknown) {
      // Fallback to console logging if file logging fails
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '❌ Failed to configure file logging, falling back to console:',
        errorMessage
      );

      return {
        level: this.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            colorize: !this.isProduction(),
          },
        },
      };
    }
  }

  // MQTT Configuration
  getMqttConfig() {
    return {
      host: this.env.MQTT_HOST,
      port: this.env.MQTT_PORT,
      username: this.env.MQTT_USERNAME,
      password: this.env.MQTT_PASSWORD,
      clientId: this.env.MQTT_CLIENT_ID,
      keepalive: this.env.MQTT_KEEPALIVE,
      clean: this.env.MQTT_CLEAN_SESSION,
      reconnectPeriod: this.env.MQTT_RECONNECT_PERIOD,
      connectTimeout: this.env.MQTT_CONNECT_TIMEOUT,
      qos: this.env.MQTT_QOS as 0 | 1 | 2,
      retain: this.env.MQTT_RETAIN,
      will: this.env.MQTT_WILL_TOPIC
        ? {
            topic: this.env.MQTT_WILL_TOPIC,
            payload: this.env.MQTT_WILL_PAYLOAD || '',
            qos: this.env.MQTT_WILL_QOS as 0 | 1 | 2,
            retain: this.env.MQTT_WILL_RETAIN,
          }
        : undefined,
      maxReconnectAttempts: this.env.MQTT_MAX_RECONNECT_ATTEMPTS,
    };
  }

  getMqttBrokerUrl(): string {
    return `mqtt://${this.env.MQTT_HOST}:${this.env.MQTT_PORT}`;
  }

  getMqttBrokerHost(): string {
    return this.env.MQTT_HOST;
  }

  getMqttBrokerPort(): number {
    return this.env.MQTT_PORT;
  }

  getMqttSecureBrokerPort(): number {
    return this.env.MQTT_SECURE_PORT || 8883;
  }

  getMqttSecureBrokerUrl(): string {
    return `mqtts://${this.env.MQTT_HOST}:${this.getMqttSecureBrokerPort()}`;
  }

  private parseLogging(logging: string): TypeOrmModuleOptions['logging'] {
    if (logging === 'true') return true;
    if (logging === 'false') return false;
    if (logging === 'all') return 'all';

    const validLoggingOptions: TypeOrmLoggingOption[] = [
      'query',
      'error',
      'schema',
      'warn',
      'info',
      'log',
      'migration',
    ];
    const options = logging
      .split(',')
      .map((opt) => opt.trim()) as TypeOrmLoggingOption[];
    // Фильтруем, чтобы оставить только валидные опции
    return options.filter((opt) => validLoggingOptions.includes(opt));
  }

  // OpenTelemetry Configuration
  getOpenTelemetryConfig(): OpenTelemetryConfig {
    const baseUrl = this.env.OTEL_COLLECTOR_URL;
    
    return {
      enabled: this.env.OTEL_ENABLED,
      serviceName: this.env.OTEL_SERVICE_NAME,
      serviceVersion: this.env.OTEL_SERVICE_VERSION,
      collectorUrl: baseUrl,
      endpoints: {
        traces: this.env.OTEL_COLLECTOR_TRACES_ENDPOINT || `${baseUrl}/v1/traces`,
        metrics: this.env.OTEL_COLLECTOR_METRICS_ENDPOINT || `${baseUrl}/v1/metrics`,
        logs: this.env.OTEL_COLLECTOR_LOGS_ENDPOINT || `${baseUrl}/v1/logs`,
      },
      tracing: {
        enabled: this.env.OTEL_ENABLE_TRACING,
        sampler: this.env.OTEL_TRACES_SAMPLER,
        samplerRatio: this.env.OTEL_TRACES_SAMPLER_RATIO,
      },
      metrics: {
        enabled: this.env.OTEL_ENABLE_METRICS,
        exportInterval: this.env.OTEL_METRICS_EXPORT_INTERVAL,
      },
      logging: {
        enabled: this.env.OTEL_ENABLE_LOGGING,
      },
      exporter: {
        timeout: this.env.OTEL_EXPORTER_TIMEOUT,
        batchSize: this.env.OTEL_BATCH_SIZE,
        batchTimeout: this.env.OTEL_BATCH_TIMEOUT,
        maxQueueSize: this.env.OTEL_MAX_QUEUE_SIZE,
      },
      debug: this.env.OTEL_DEBUG || this.isDevelopment(),
      resourceAttributes: this.parseResourceAttributes(this.env.OTEL_RESOURCE_ATTRIBUTES),
    };
  }

  getOpenTelemetryServiceName(): string {
    return this.env.OTEL_SERVICE_NAME;
  }

  getOpenTelemetryCollectorUrl(): string {
    return this.env.OTEL_COLLECTOR_URL;
  }

  isOpenTelemetryEnabled(): boolean {
    return this.env.OTEL_ENABLED;
  }

  isOpenTelemetryTracingEnabled(): boolean {
    return this.env.OTEL_ENABLED && this.env.OTEL_ENABLE_TRACING;
  }

  isOpenTelemetryMetricsEnabled(): boolean {
    return this.env.OTEL_ENABLED && this.env.OTEL_ENABLE_METRICS;
  }

  isOpenTelemetryLoggingEnabled(): boolean {
    return this.env.OTEL_ENABLED && this.env.OTEL_ENABLE_LOGGING;
  }

  getResourceAttributes(): Record<string, string> {
    return this.parseResourceAttributes(this.env.OTEL_RESOURCE_ATTRIBUTES);
  }

  private parseResourceAttributes(attributesString?: string): Record<string, string> {
    if (!attributesString) {
      return {
        'service.name': this.env.OTEL_SERVICE_NAME,
        'service.version': this.env.OTEL_SERVICE_VERSION,
        'environment': this.env.NODE_ENV,
        'deployment.environment': this.env.NODE_ENV,
      };
    }

    const attributes: Record<string, string> = {};
    
    // Парсим строку формата "key1=value1,key2=value2"
    attributesString.split(',').forEach(pair => {
      const [key, value] = pair.trim().split('=');
      if (key && value) {
        attributes[key.trim()] = value.trim();
      }
    });

    // Добавляем базовые атрибуты, если они не указаны
    return {
      'service.name': this.env.OTEL_SERVICE_NAME,
      'service.version': this.env.OTEL_SERVICE_VERSION,
      'environment': this.env.NODE_ENV,
      'deployment.environment': this.env.NODE_ENV,
      ...attributes,
    };
  }
}
