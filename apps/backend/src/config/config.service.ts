import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envConfigSchema, AppConfig } from './config.schema';

// Import domain config services
import { CommonConfigService } from '../common/config/common-config.service';
import { AuthConfigService } from '../auth/config/auth-config.service';
import { DatabaseConfigService } from '../database/config/database-config.service';
import { MqttConfigService } from '../mqtt/config/mqtt-config.service';
import { TelemetryConfigService } from '../common/config/telemetry-config.service';
import { DevicesConfigService } from '../devices/config/devices-config.service';
import { UsersConfigService } from '../users/config/users-config.service';

// Import types
import type { LogRequest, LogResponse } from '../common/types/logging.types';
import type { OpenTelemetryConfig } from '../common/observability/config.types';

@Injectable()
export class ConfigService {
  private readonly env: ReturnType<typeof envConfigSchema.parse>;
  
  // Domain config services
  public readonly common: CommonConfigService;
  public readonly auth: AuthConfigService;
  public readonly database: DatabaseConfigService;
  public readonly mqtt: MqttConfigService;
  public readonly telemetry: TelemetryConfigService;
  public readonly devices: DevicesConfigService;
  public readonly users: UsersConfigService;

  constructor() {
    // Validate environment variables
    const parsed = envConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration: ${parsed.error.message}`
      );
    }
    this.env = parsed.data;

    // Initialize domain config services - pass process.env directly
    this.common = new CommonConfigService(process.env);
    this.auth = new AuthConfigService(process.env);
    this.database = new DatabaseConfigService(process.env);
    this.mqtt = new MqttConfigService(process.env);
    this.telemetry = new TelemetryConfigService(process.env);
    this.devices = new DevicesConfigService(process.env);
    this.users = new UsersConfigService(process.env);
  }

  // Legacy compatibility - direct access to env values
  get<T extends keyof typeof this.env>(key: T): (typeof this.env)[T] {
    return this.env[key];
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

  // Redis configuration (delegated to common config)
  getRedisConfig() {
    return this.common.getRedisConfig();
  }

  // CORS configuration (delegated to common config)
  getCorsConfig() {
    return this.common.getCorsConfig();
  }

  // Rate limiting configuration (delegated to common config)
  getRateLimitConfig() {
    return this.common.getRateLimitConfig();
  }

  // JWT configuration (delegated to auth config)
  getJwtConfig() {
    return this.auth.getJwtConfig();
  }

  // Keycloak configuration (delegated to auth config)
  getKeycloakConfig() {
    return this.auth.getKeycloakConfig();
  }

  // OAuth2 Proxy configuration (delegated to auth config)
  getOAuth2ProxyHeaders() {
    return this.auth.getOAuth2ProxyHeaders();
  }

  // Development user configuration (delegated to auth config)
  getDevUserConfig() {
    return this.auth.getDevUserConfig();
  }

  // Logging configuration (delegated to common config)
  getLoggingConfig() {
    return this.common.getLoggingConfig();
  }

  // MQTT configuration (delegated to mqtt config)
  getMqttConfig() {
    return this.mqtt.getAll();
  }

  // MQTT client options (delegated to mqtt config)
  getMqttClientOptions() {
    return this.mqtt.getClientOptions();
  }

  // OpenTelemetry configuration (delegated to telemetry config)
  getOpenTelemetryConfig(): OpenTelemetryConfig {
    return this.telemetry.getOpenTelemetryConfig();
  }

  // Legacy method compatibility
  shouldLogRequest(request: LogRequest): boolean {
    const loggingConfig = this.getLoggingConfig();
    
    if (!loggingConfig.enableRequestLogging) {
      return false;
    }

    // Skip health check endpoints
    if (request.url?.includes('/health') || request.url?.includes('/metrics')) {
      return false;
    }

    return true;
  }

  shouldLogResponse(response: LogResponse): boolean {
    const loggingConfig = this.getLoggingConfig();
    
    if (!loggingConfig.enableRequestLogging) {
      return false;
    }

    // Log errors always
    if (response.statusCode && response.statusCode >= 400) {
      return true;
    }

    return true;
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
}
