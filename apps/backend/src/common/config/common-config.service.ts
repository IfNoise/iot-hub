import { Injectable } from '@nestjs/common';
import { commonConfigSchema, CommonConfig } from './common-config.schema';

@Injectable()
export class CommonConfigService {
  private readonly config: CommonConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = commonConfigSchema.parse({
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      corsOrigin: env.CORS_ORIGIN,
      corsCredentials: env.CORS_CREDENTIALS,
      allowedOrigins: env.ALLOWED_ORIGINS,
      rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: env.RATE_LIMIT_MAX,
      redisUrl: env.REDIS_URL,
      redisEnabled: env.REDIS_ENABLED,
      redisRetryAttempts: env.REDIS_RETRY_ATTEMPTS,
      redisRetryDelay: env.REDIS_RETRY_DELAY,
      logLevel: env.LOG_LEVEL,
      logToFile: env.LOG_TO_FILE,
      logFilePath: env.LOG_FILE_PATH,
      logFileMaxSize: env.LOG_FILE_MAX_SIZE,
      logFileMaxFiles: env.LOG_FILE_MAX_FILES,
      logFormat: env.LOG_FORMAT,
      logEnableMetadata: env.LOG_ENABLE_METADATA,
      logEnableRequestLogging: env.LOG_ENABLE_REQUEST_LOGGING,
      enableFileLoggingInDev: env.ENABLE_FILE_LOGGING_IN_DEV,
    });
  }

  get<T extends keyof CommonConfig>(key: T): CommonConfig[T] {
    return this.config[key];
  }

  getAll(): CommonConfig {
    return this.config;
  }

  // Environment-aware getters
  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  // Convenience methods
  getCorsConfig() {
    return {
      origin: this.config.corsOrigin,
      credentials: this.config.corsCredentials,
    };
  }

  getRateLimitConfig() {
    return {
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMax,
    };
  }

  getRedisConfig() {
    return {
      url: this.config.redisUrl,
      enabled: this.config.redisEnabled,
      retryAttempts: this.config.redisRetryAttempts,
      retryDelay: this.config.redisRetryDelay,
    };
  }

  getLoggingConfig() {
    return {
      level: this.config.logLevel,
      toFile: this.config.logToFile,
      filePath: this.config.logFilePath,
      fileMaxSize: this.config.logFileMaxSize,
      fileMaxFiles: this.config.logFileMaxFiles,
      format: this.config.logFormat,
      enableMetadata: this.config.logEnableMetadata,
      enableRequestLogging: this.config.logEnableRequestLogging,
      enableFileLoggingInDev: this.config.enableFileLoggingInDev,
    };
  }
}
