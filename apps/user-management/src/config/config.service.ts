import { Injectable } from '@nestjs/common';
import { envConfigSchema, AppConfig } from './config.schema.js';

// Import domain config services
import { CommonConfigService } from './common/common-config.service.js';
import { AuthConfigService } from './auth/auth-config.service.js';
import { DatabaseConfigService } from './database/database-config.service.js';
import { TelemetryConfigService } from './telemetry/telemetry-config.service.js';
import { KafkaConfigService } from './kafka/kafka-config.service.js';

// Import types
import type { LogRequest, LogResponse } from '../common/types/logging.types.js';
import type { OpenTelemetryConfig } from './telemetry/telemetry-config.schema.js';
import type {
  DrizzleConnectionOptions,
  DatabaseEnvironmentConfig,
} from './database/database-config.schema.js';

@Injectable()
export class ConfigService {
  // Domain config services
  public readonly common: CommonConfigService;
  public readonly auth: AuthConfigService;
  public readonly database: DatabaseConfigService;
  public readonly telemetry: TelemetryConfigService;
  public readonly kafka: KafkaConfigService;

  constructor() {
    // Validate environment variables once
    const parsed = envConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration: ${parsed.error.message}`
      );
    }

    // Initialize domain config services - pass process.env directly
    this.common = new CommonConfigService(process.env);
    this.auth = new AuthConfigService(process.env);
    this.database = new DatabaseConfigService(process.env);
    this.telemetry = new TelemetryConfigService(process.env);
    this.kafka = new KafkaConfigService(process.env);
  }

  // Get all configuration as structured object
  getAll(): AppConfig {
    return {
      common: this.common.getAll(),
      auth: this.auth.getAll(),
      database: this.database.getAll(),
      telemetry: this.telemetry.getAll(),
      kafka: this.kafka.getAll(),
    };
  }

  // Environment-aware getters (delegated to common config)
  isDevelopment(): boolean {
    return this.common.isDevelopment();
  }

  isProduction(): boolean {
    return this.common.isProduction();
  }

  isTest(): boolean {
    return this.common.isTest();
  }

  // Database configuration with environment-specific overrides
  getDatabaseConfig(): DatabaseEnvironmentConfig {
    if (this.isDevelopment()) {
      return this.database.getDevelopmentConfig();
    }

    if (this.isProduction()) {
      return this.database.getProductionConfig();
    }

    if (this.isTest()) {
      return this.database.getTestConfig();
    }

    return this.database.getDevelopmentConfig(); // fallback
  }

  // Get Drizzle connection options
  getDrizzleConnectionOptions(): DrizzleConnectionOptions {
    return this.database.getDrizzleConnectionOptions();
  }

  // Get database URL for Drizzle
  getDatabaseUrl(): string {
    return this.database.getDatabaseUrl();
  }

  // Convenience methods for checking feature flags
  isKeycloakEnabled(): boolean {
    return this.auth.isKeycloakEnabled();
  }

  isRedisEnabled(): boolean {
    return this.common.get('redisEnabled');
  }

  isOpenTelemetryEnabled(): boolean {
    return this.telemetry.isEnabled();
  }

  isKafkaEnabled(): boolean {
    return this.kafka.isEnabled();
  }

  // ===========================================
  // CONVENIENCE METHODS - Use domain services directly
  // ===========================================

  /**
   * Use this.common.getRedisConfig() instead for direct access
   */
  getRedisConfig() {
    return this.common.getRedisConfig();
  }

  /**
   * Use this.common.getCorsConfig() instead for direct access
   */
  getCorsConfig() {
    return this.common.getCorsConfig();
  }

  /**
   * Use this.common.getRateLimitConfig() instead for direct access
   */
  getRateLimitConfig() {
    return this.common.getRateLimitConfig();
  }

  /**
   * Use this.auth.getJwtConfig() instead for direct access
   */
  getJwtConfig() {
    return this.auth.getJwtConfig();
  }

  /**
   * Use this.auth.getKeycloakConfig() instead for direct access
   */
  getKeycloakConfig() {
    return this.auth.getKeycloakConfig();
  }

  /**
   * Use this.common.getLoggingConfig() instead for direct access
   */
  getLoggingConfig() {
    return this.common.getLoggingConfig();
  }

  /**
   * Use this.telemetry.getOpenTelemetryConfig() instead for direct access
   */
  getOpenTelemetryConfig(): OpenTelemetryConfig {
    return this.telemetry.getOpenTelemetryConfig();
  }

  /**
   * Use this.kafka.getKafkaOptions() instead for direct access
   */
  getKafkaOptions() {
    return this.kafka.getKafkaOptions();
  }

  /**
   * Use this.common.shouldLogRequest() instead for direct access
   */
  shouldLogRequest(request: LogRequest): boolean {
    return this.common.shouldLogRequest(request);
  }

  /**
   * Use this.common.shouldLogResponse() instead for direct access
   */
  shouldLogResponse(response: LogResponse): boolean {
    return this.common.shouldLogResponse(response);
  }
}
