import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

/**
 * Пример использования декомпозированной конфигурации
 * 
 * Этот класс демонстрирует различные способы использования
 * новой модульной архитектуры конфигурации.
 */
@Injectable()
export class ConfigUsageExample {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Пример 1: Использование доменных конфигураций
   */
  getDomainConfigurations() {
    return {
      // Аутентификация
      jwtConfig: this.configService.auth.getJwtConfig(),
      keycloakEnabled: this.configService.auth.isKeycloakEnabled(),
      oAuth2Headers: this.configService.auth.getOAuth2ProxyHeaders(),

      // База данных
      dbConnection: this.configService.database.getConnectionInfo(),
      typeOrmConfig: this.configService.database.getTypeOrmConfig(),
      isPostgres: this.configService.database.isPostgres(),

      // MQTT
      mqttConnection: this.configService.mqtt.getConnectionConfig(),
      mqttProtocol: this.configService.mqtt.getProtocolConfig(),
      mqttClientOptions: this.configService.mqtt.getClientOptions(),

      // Общие настройки
      corsConfig: this.configService.common.getCorsConfig(),
      loggingConfig: this.configService.common.getLoggingConfig(),
      environment: {
        isDev: this.configService.common.isDevelopment(),
        isProd: this.configService.common.isProduction(),
        isTest: this.configService.common.isTest(),
      },

      // Телеметрия
      otelConfig: this.configService.telemetry.getOpenTelemetryConfig(),
      otelEnabled: this.configService.telemetry.isEnabled(),

      // Устройства
      deviceLimits: this.configService.devices.getLimitsConfig(),
      deviceTimeouts: this.configService.devices.getTimeoutConfig(),

      // Пользователи
      userSessions: this.configService.users.getSessionConfig(),
      registrationConfig: this.configService.users.getRegistrationConfig(),
    };
  }

  /**
   * Пример 2: Обратная совместимость
   */
  getBackwardCompatibility() {
    return {
      // Старый способ - все еще работает
      nodeEnv: this.configService.get('NODE_ENV'),
      port: this.configService.get('PORT'),
      dbHost: this.configService.get('DATABASE_HOST'),

      // Старые convenience методы
      isDev: this.configService.isDevelopment(),
      jwtConfig: this.configService.getJwtConfig(),
      corsConfig: this.configService.getCorsConfig(),
    };
  }

  /**
   * Пример 3: Композиция всех конфигураций
   */
  getAllConfigurations() {
    return this.configService.getAll();
  }

  /**
   * Пример 4: Feature flags
   */
  getFeatureFlags() {
    return {
      keycloakEnabled: this.configService.isKeycloakEnabled(),
      redisEnabled: this.configService.isRedisEnabled(),
      telemetryEnabled: this.configService.isOpenTelemetryEnabled(),
      userRegistrationEnabled: this.configService.isUserRegistrationEnabled(),
      emailVerificationRequired: this.configService.isEmailVerificationRequired(),
    };
  }

  /**
   * Пример 5: Environment-specific конфигурации
   */
  getEnvironmentSpecificConfig() {
    if (this.configService.isDevelopment()) {
      return {
        database: this.configService.database.getDevelopmentConfig(),
        logging: { level: 'debug', enableFileLogging: false },
        cors: { origin: '*', credentials: true },
      };
    }

    if (this.configService.isProduction()) {
      return {
        database: this.configService.database.getProductionConfig(),
        logging: { level: 'warn', enableFileLogging: true },
        cors: { origin: this.configService.get('ALLOWED_ORIGINS')?.split(',') || [], credentials: true },
      };
    }

    if (this.configService.isTest()) {
      return {
        database: this.configService.database.getTestConfig(),
        logging: { level: 'error', enableFileLogging: false },
        cors: { origin: 'http://localhost:3000', credentials: false },
      };
    }

    return {};
  }

  /**
   * Пример 6: Validation и error handling
   */
  validateConfiguration() {
    const errors: string[] = [];

    // Проверка обязательных настроек
    try {
      const jwtSecret = this.configService.auth.get('jwtSecret');
      if (!jwtSecret || jwtSecret.length < 32) {
        errors.push('JWT secret must be at least 32 characters long');
      }
    } catch (error) {
      errors.push(`JWT configuration error: ${error}`);
    }

    try {
      const dbConfig = this.configService.database.getConnectionInfo();
      if (!dbConfig.host || !dbConfig.database) {
        errors.push('Database connection parameters are missing');
      }
    } catch (error) {
      errors.push(`Database configuration error: ${error}`);
    }

    // Проверка feature flags совместимости
    if (this.configService.isKeycloakEnabled() && this.configService.isDevelopment()) {
      const devUser = this.configService.auth.getDevUserConfig();
      if (!devUser.id || !devUser.email) {
        errors.push('Development user configuration is incomplete when Keycloak is enabled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
