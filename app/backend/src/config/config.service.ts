import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { envConfigSchema } from './config.schema';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
    if (this.isDevelopment() || this.isTest()) {
      return { windowMs: 60000, max: 1000 }; // Мягкие лимиты для разработки/тестирования
    }

    return {
      windowMs: this.env.RATE_LIMIT_WINDOW_MS,
      max: this.env.RATE_LIMIT_MAX,
    };
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
}
