import { Injectable } from '@nestjs/common';
import { commonConfigSchema, CommonConfig } from './common-config.schema.js';

// Import types for logging
import type {
  LogRequest,
  LogResponse,
} from '../../common/types/logging.types.js';

@Injectable()
export class CommonConfigService {
  private readonly config: CommonConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = commonConfigSchema.parse({
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      serviceName: env.SERVICE_NAME,
      serviceVersion: env.SERVICE_VERSION,
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
      // Loki configuration
      lokiEnabled: env.LOKI_ENABLED,
      lokiUrl: env.LOKI_URL,
      lokiLabels: env.LOKI_LABELS,
      lokiTimeout: env.LOKI_TIMEOUT,
      lokiSilenceErrors: env.LOKI_SILENCE_ERRORS,
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

  getLokiConfig() {
    return {
      enabled: this.config.lokiEnabled,
      url: this.config.lokiUrl,
      labels: this.parseLokiLabels(),
      timeout: this.config.lokiTimeout,
      silenceErrors: this.config.lokiSilenceErrors,
    };
  }

  private parseLokiLabels(): Record<string, string> {
    const defaultLabels = {
      service: this.config.serviceName,
      environment: this.config.nodeEnv,
      version: this.config.serviceVersion,
    };

    if (!this.config.lokiLabels) {
      return defaultLabels;
    }

    try {
      // Парсим строку вида "key1=value1,key2=value2"
      const customLabels = this.config.lokiLabels
        .split(',')
        .reduce((acc, pair) => {
          const [key, value] = pair.split('=').map((s) => s.trim());
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);

      return { ...defaultLabels, ...customLabels };
    } catch {
      return defaultLabels;
    }
  }

  // Logging decision methods
  shouldLogRequest(request: LogRequest): boolean {
    if (!this.config.logEnableRequestLogging) {
      return false;
    }

    // Skip health check endpoints
    if (request.url?.includes('/health') || request.url?.includes('/metrics')) {
      return false;
    }

    return true;
  }

  shouldLogResponse(response: LogResponse): boolean {
    if (!this.config.logEnableRequestLogging) {
      return false;
    }

    // Log errors always
    if (response.statusCode && response.statusCode >= 400) {
      return true;
    }

    return true;
  }
}
