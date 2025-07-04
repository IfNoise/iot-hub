import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  composedConfigSchema,
  AppConfig,
  createAppConfigFromEnv,
} from './schemas/composed-config.schema.js';
import { FeatureFlags, EnvValidationResult } from './types/config.types.js';

// Import domain config services
import { CommonConfigService } from '../common/config/common-config.service.js';
import { AuthConfigService } from '../auth/config/auth-config.service.js';
import { DatabaseConfigService } from '../database/config/database-config.service.js';
import { MqttConfigService } from '../mqtt/config/mqtt-config.service.js';
import { TelemetryConfigService } from '../common/config/telemetry-config.service.js';
import { DevicesConfigService } from '../devices/config/devices-config.service.js';
import { UsersConfigService } from '../users/config/users-config.service.js';

/**
 * Centralized configuration service
 *
 * This service provides:
 * - Centralized environment validation
 * - Access to domain-specific configuration services
 * - Feature flags aggregation
 * - Environment-aware configuration selection
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly validatedEnv: AppConfig;

  // Domain config services - publicly accessible
  public readonly common: CommonConfigService;
  public readonly auth: AuthConfigService;
  public readonly database: DatabaseConfigService;
  public readonly mqtt: MqttConfigService;
  public readonly telemetry: TelemetryConfigService;
  public readonly devices: DevicesConfigService;
  public readonly users: UsersConfigService;

  constructor() {
    // Validate all environment variables at startup
    const validationResult = this.validateEnvironment();
    if (!validationResult.isValid) {
      this.logger.error(
        'Configuration validation failed:',
        validationResult.errors
      );
      throw new Error(
        `Invalid environment configuration: ${validationResult.errors.join(
          ', '
        )}`
      );
    }

    if (validationResult.warnings.length > 0) {
      this.logger.warn('Configuration warnings:', validationResult.warnings);
    }

    // Parse and validate all configuration
    const parsed = composedConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Configuration parsing failed: ${parsed.error.message}`);
    }
    this.validatedEnv = createAppConfigFromEnv(parsed.data);

    // Initialize domain config services
    this.common = new CommonConfigService(process.env);
    this.auth = new AuthConfigService(process.env);
    this.database = new DatabaseConfigService(process.env);
    this.mqtt = new MqttConfigService(process.env);
    this.telemetry = new TelemetryConfigService(process.env);
    this.devices = new DevicesConfigService(process.env);
    this.users = new UsersConfigService(process.env);

    this.logConfigurationSummary();
  }

  /**
   * Get complete application configuration
   */
  getAppConfig(): AppConfig {
    return this.validatedEnv;
  }

  /**
   * Get feature flags state
   */
  getFeatureFlags(): FeatureFlags {
    return {
      keycloakEnabled: this.auth.isKeycloakEnabled(),
      redisEnabled: this.common.get('redisEnabled'),
      openTelemetryEnabled: this.telemetry.isEnabled(),
      userRegistrationEnabled: this.users.isRegistrationEnabled(),
      emailVerificationRequired: this.users.isEmailVerificationRequired(),
      fileLoggingEnabled: this.common.get('logToFile'),
      lokiLoggingEnabled: this.common.get('lokiEnabled'),
    };
  }

  /**
   * Environment detection methods
   */
  isDevelopment(): boolean {
    return this.common.isDevelopment();
  }

  isProduction(): boolean {
    return this.common.isProduction();
  }

  isTest(): boolean {
    return this.common.isTest();
  }

  /**
   * Get environment-aware database configuration
   */
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

  /**
   * Validate environment variables
   */
  private validateEnvironment(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required variables
    const requiredVars = [
      'DATABASE_PASSWORD',
      'DATABASE_USER',
      'DATABASE_NAME',
      'JWT_SECRET',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // JWT secret validation
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    // Development-specific warnings
    if (this.common?.isDevelopment()) {
      if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
        warnings.push('CORS_ORIGIN is set to "*" in development mode');
      }
    }

    // Production-specific validations
    if (this.common?.isProduction()) {
      if (!process.env.REDIS_URL) {
        warnings.push('REDIS_URL not set in production mode');
      }

      if (process.env.DB_SYNCHRONIZE === 'true') {
        errors.push('DB_SYNCHRONIZE should not be true in production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Log configuration summary for debugging
   */
  private logConfigurationSummary(): void {
    if (!this.isDevelopment()) {
      return;
    }

    this.logger.debug('Configuration Summary:', {
      environment: this.common.get('nodeEnv'),
      port: this.common.get('port'),
      database: {
        type: this.database.get('type'),
        host: this.database.get('host'),
        port: this.database.get('port'),
      },
      features: this.getFeatureFlags(),
    });
  }
}
