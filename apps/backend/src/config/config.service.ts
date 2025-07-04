import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envConfigSchema, AppConfig } from './config.schema.js';

// Import domain config services
import { CommonConfigService } from '../common/config/common-config.service.js';
import { AuthConfigService } from '../auth/config/auth-config.service.js';
import { DatabaseConfigService } from '../database/config/database-config.service.js';
import { MqttConfigService } from '../mqtt/config/mqtt-config.service.js';
import { TelemetryConfigService } from '../common/config/telemetry-config.service.js';
import { DevicesConfigService } from '../devices/config/devices-config.service.js';
import { UsersConfigService } from '../users/config/users-config.service.js';

// Import types
import type { LogRequest, LogResponse } from '../common/types/logging.types.js';
import type { OpenTelemetryConfig } from '../common/observability/config.types.js';

@Injectable()
export class ConfigService {
  // Domain config services
  public readonly common: CommonConfigService;
  public readonly auth: AuthConfigService;
  public readonly database: DatabaseConfigService;
  public readonly mqtt: MqttConfigService;
  public readonly telemetry: TelemetryConfigService;
  public readonly devices: DevicesConfigService;
  public readonly users: UsersConfigService;

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
    this.mqtt = new MqttConfigService(process.env);
    this.telemetry = new TelemetryConfigService(process.env);
    this.devices = new DevicesConfigService(process.env);
    this.users = new UsersConfigService(process.env);
  }

  // Get all configuration as structured object
  getAll(): AppConfig {
    return {
      common: this.common.getAll(),
      auth: this.auth.getAll(),
      database: this.database.getAll(),
      mqtt: this.mqtt.getAll(),
      telemetry: this.telemetry.getAll(),
      devices: this.devices.getAll(),
      users: this.users.getAll(),
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
  getDatabaseConfig(): TypeOrmModuleOptions {
    if (this.isDevelopment()) {
      return this.database.getDevelopmentConfig();
    }

    if (this.isProduction()) {
      return this.database.getProductionConfig();
    }

    if (this.isTest()) {
      return this.database.getTestConfig();
    }

    return this.database.getTypeOrmConfig();
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

  isUserRegistrationEnabled(): boolean {
    return this.users.isRegistrationEnabled();
  }

  isEmailVerificationRequired(): boolean {
    return this.users.isEmailVerificationRequired();
  }

  // ===========================================
  // DEPRECATED METHODS - Use domain services directly
  // ===========================================

  /**
   * @deprecated Use this.common.getRedisConfig() instead
   */
  getRedisConfig() {
    return this.common.getRedisConfig();
  }

  /**
   * @deprecated Use this.mqtt.getBrokerUrl() instead
   */
  getMqttBrokerUrl(): string {
    return this.mqtt.getBrokerUrl();
  }

  /**
   * @deprecated Use this.common.getCorsConfig() instead
   */
  getCorsConfig() {
    return this.common.getCorsConfig();
  }

  /**
   * @deprecated Use this.common.getRateLimitConfig() instead
   */
  getRateLimitConfig() {
    return this.common.getRateLimitConfig();
  }

  /**
   * @deprecated Use this.auth.getJwtConfig() instead
   */
  getJwtConfig() {
    return this.auth.getJwtConfig();
  }

  /**
   * @deprecated Use this.auth.getKeycloakConfig() instead
   */
  getKeycloakConfig() {
    return this.auth.getKeycloakConfig();
  }

  /**
   * @deprecated Use this.auth.getOAuth2ProxyHeaders() instead
   */
  getOAuth2ProxyHeaders() {
    return this.auth.getOAuth2ProxyHeaders();
  }

  /**
   * @deprecated Use this.auth.getDevUserConfig() instead
   */
  getDevUserConfig() {
    return this.auth.getDevUserConfig();
  }

  /**
   * @deprecated Use this.common.getLoggingConfig() instead
   */
  getLoggingConfig() {
    return this.common.getLoggingConfig();
  }

  /**
   * @deprecated Use this.mqtt.getAll() instead
   */
  getMqttConfig() {
    return this.mqtt.getAll();
  }

  /**
   * @deprecated Use this.mqtt.getClientOptions() instead
   */
  getMqttClientOptions() {
    return this.mqtt.getClientOptions();
  }

  /**
   * @deprecated Use this.telemetry.getOpenTelemetryConfig() instead
   */
  getOpenTelemetryConfig(): OpenTelemetryConfig {
    return this.telemetry.getOpenTelemetryConfig();
  }

  /**
   * @deprecated Move logging logic to CommonConfigService or LoggingService
   * Use this.common.shouldLogRequest() instead
   */
  shouldLogRequest(request: LogRequest): boolean {
    return this.common.shouldLogRequest(request);
  }

  /**
   * @deprecated Move logging logic to CommonConfigService or LoggingService
   * Use this.common.shouldLogResponse() instead
   */
  shouldLogResponse(response: LogResponse): boolean {
    return this.common.shouldLogResponse(response);
  }
}
