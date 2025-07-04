/**
 * Centralized configuration types and constants
 */

export const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_FORMATS = ['json', 'pretty'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

export const DATABASE_TYPES = [
  'postgres',
  'mysql',
  'mariadb',
  'cockroachdb',
  'mongodb',
] as const;
export type DatabaseType = (typeof DATABASE_TYPES)[number];

export const USER_ROLES = ['admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OTEL_SAMPLERS = [
  'always_on',
  'always_off',
  'traceidratio',
  'parentbased_always_on',
] as const;
export type OtelSampler = (typeof OTEL_SAMPLERS)[number];

// Configuration keys grouped by domain
export const CONFIG_KEYS = {
  // Common/Infrastructure
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',

  // Database
  DB_TYPE: 'DB_TYPE',
  DATABASE_HOST: 'DATABASE_HOST',
  DATABASE_PORT: 'DATABASE_PORT',
  DATABASE_PASSWORD: 'DATABASE_PASSWORD',
  DATABASE_USER: 'DATABASE_USER',
  DATABASE_NAME: 'DATABASE_NAME',

  // Auth
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRATION: 'JWT_EXPIRATION',

  // MQTT
  MQTT_HOST: 'MQTT_HOST',
  MQTT_PORT: 'MQTT_PORT',
  MQTT_SECURE_PORT: 'MQTT_SECURE_PORT',

  // Telemetry
  OTEL_ENABLED: 'OTEL_ENABLED',
  OTEL_SERVICE_NAME: 'OTEL_SERVICE_NAME',

  // Devices
  DEVICE_TIMEOUT_MS: 'DEVICE_TIMEOUT_MS',
  MAX_DEVICES_PER_USER: 'MAX_DEVICES_PER_USER',

  // Users
  ENABLE_USER_REGISTRATION: 'ENABLE_USER_REGISTRATION',
  REQUIRE_EMAIL_VERIFICATION: 'REQUIRE_EMAIL_VERIFICATION',
} as const;

// Default values
export const CONFIG_DEFAULTS = {
  NODE_ENV: 'development' as NodeEnvironment,
  PORT: 3000,
  LOG_LEVEL: 'info' as LogLevel,
  LOG_FORMAT: 'json' as LogFormat,
  DB_TYPE: 'postgres' as DatabaseType,
  DATABASE_PORT: 5432,
  JWT_EXPIRATION: '1h',
  MQTT_PORT: 1883,
  MQTT_SECURE_PORT: 8883,
  MQTT_QOS: 1,
  OTEL_SERVICE_NAME: 'iot-hub-backend',
  OTEL_SERVICE_VERSION: '1.0.0',
  DEVICE_TIMEOUT_MS: 30000,
  MAX_DEVICES_PER_USER: 100,
  USER_SESSION_TIMEOUT_MS: 3600000,
} as const;

// Feature flags
export interface FeatureFlags {
  keycloakEnabled: boolean;
  redisEnabled: boolean;
  openTelemetryEnabled: boolean;
  userRegistrationEnabled: boolean;
  emailVerificationRequired: boolean;
  fileLoggingEnabled: boolean;
  lokiLoggingEnabled: boolean;
}

// Environment validation
export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
