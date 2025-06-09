import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { envConfigSchema } from './config.schema';

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
  getDatabaseConfig(): any {
    const baseConfig = {
      type: this.env.DB_TYPE,
      host: this.env.DATABASE_HOST,
      port: this.env.DATABASE_PORT,
      username: this.env.DATABASE_USER,
      password: this.env.DATABASE_PASSWORD,
      database: this.env.DATABASE_NAME,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    };

    // Environment-specific overrides
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
      };
    }

    if (this.isProduction()) {
      return {
        ...baseConfig,
        synchronize: false, // НИКОГДА в продакшне
        logging: ['error', 'warn'] as any,
        ssl: this.env.DB_SSL,
        poolSize: this.env.DB_POOL_SIZE,
        extra: {
          ssl: this.env.DB_SSL ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          max: 20,
          min: 5,
        },
        cache: {
          duration: 30000,
        },
      };
    }

    if (this.isTest()) {
      return {
        ...baseConfig,
        synchronize: true,
        logging: false,
        dropSchema: true,
        cache: false,
        ssl: false,
      };
    }

    // Fallback - использовать значения из .env
    return {
      ...baseConfig,
      synchronize: this.env.DB_SYNCHRONIZE,
      logging: this.parseLogging(this.env.DB_LOGGING),
      dropSchema: this.env.DB_DROP_SCHEMA,
      ssl: this.env.DB_SSL,
      poolSize: this.env.DB_POOL_SIZE,
    };
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
      return {
        origin: this.env.ALLOWED_ORIGINS?.split(',') || false,
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
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
      return { enabled: false };
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
      return undefined; // Отключить для dev/test
    }

    return {
      windowMs: this.env.RATE_LIMIT_WINDOW_MS,
      max: this.env.RATE_LIMIT_MAX,
    };
  }

  private parseLogging(logging: string): boolean | string[] {
    if (logging === 'true') return true;
    if (logging === 'false') return false;
    return logging.split(',');
  }
}
