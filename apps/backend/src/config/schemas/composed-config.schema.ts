import { z } from 'zod';
import { commonConfigSchema } from '../../common/config/common-config.schema.js';
import { authConfigSchema } from '../../auth/config/auth-config.schema.js';
import { databaseConfigSchema } from '../../database/config/database-config.schema.js';
import { mqttConfigSchema } from '../../mqtt/config/mqtt-config.schema.js';
import { telemetryConfigSchema } from '../../common/config/telemetry-config.schema.js';
import { devicesConfigSchema } from '../../devices/config/devices-config.schema.js';
import { usersConfigSchema } from '../../users/config/users-config.schema.js';

// Import config services for proper instantiation
import { CommonConfigService } from '../../common/config/common-config.service.js';
import { AuthConfigService } from '../../auth/config/auth-config.service.js';
import { DatabaseConfigService } from '../../database/config/database-config.service.js';
import { MqttConfigService } from '../../mqtt/config/mqtt-config.service.js';
import { TelemetryConfigService } from '../../common/config/telemetry-config.service.js';
import { DevicesConfigService } from '../../devices/config/devices-config.service.js';
import { UsersConfigService } from '../../users/config/users-config.service.js';
import {
  NODE_ENVIRONMENTS,
  DATABASE_TYPES,
  LOG_LEVELS,
  CONFIG_DEFAULTS,
} from '../types/config.types.js';

/**
 * Composed environment schema that validates all environment variables
 * This replaces the old envConfigSchema with better organization
 */
export const composedConfigSchema = z.object({
  // Common/Application - infrastructure level
  NODE_ENV: z.enum(NODE_ENVIRONMENTS).default(CONFIG_DEFAULTS.NODE_ENV),
  PORT: z.coerce.number().default(CONFIG_DEFAULTS.PORT),

  // Database configuration
  DB_TYPE: z.enum(DATABASE_TYPES).default(CONFIG_DEFAULTS.DB_TYPE),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(CONFIG_DEFAULTS.DATABASE_PORT),
  DATABASE_PASSWORD: z.string().min(8).max(64),
  DATABASE_USER: z.string().min(3).max(32),
  DATABASE_NAME: z.string().min(1).max(64),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.string().default('false'),
  DB_DROP_SCHEMA: z.coerce.boolean().default(false),
  DB_SSL: z.coerce.boolean().default(false),
  DB_POOL_SIZE: z.coerce.number().default(10),

  // Authentication & Authorization
  JWT_SECRET: z.string().min(32).max(64),
  JWT_EXPIRATION: z.string().default(CONFIG_DEFAULTS.JWT_EXPIRATION),

  // Keycloak & OAuth2 Proxy
  KEYCLOAK_URL: z.string().url().optional().or(z.literal('')),
  KEYCLOAK_REALM: z.string().min(1).optional().or(z.literal('')),
  KEYCLOAK_CLIENT_ID: z.string().min(1).optional().or(z.literal('')),
  OAUTH2_PROXY_USER_HEADER: z.string().default('X-Auth-Request-User'),
  OAUTH2_PROXY_EMAIL_HEADER: z.string().default('X-Auth-Request-Email'),
  OAUTH2_PROXY_PREFERRED_USERNAME_HEADER: z
    .string()
    .default('X-Auth-Request-Preferred-Username'),
  OAUTH2_PROXY_ACCESS_TOKEN_HEADER: z
    .string()
    .default('X-Auth-Request-Access-Token'),

  // Development User
  DEV_USER_ID: z.string().default('dev-user-id'),
  DEV_USER_EMAIL: z.string().email().default('dev@example.com'),
  DEV_USER_NAME: z.string().default('Dev User'),
  DEV_USER_ROLE: z.enum(['admin', 'user']).default('admin'),
  DEV_USER_AVATAR: z.string().url().optional(),
  DEV_USER_EMAIL_VERIFIED: z.coerce.boolean().default(true),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_ENABLED: z.coerce.boolean().default(true),
  REDIS_RETRY_ATTEMPTS: z.coerce.number().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().default(1000),

  // CORS & Security
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(LOG_LEVELS).default(CONFIG_DEFAULTS.LOG_LEVEL),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  LOG_FILE_MAX_SIZE: z.string().default('10M'),
  LOG_FILE_MAX_FILES: z.coerce.number().default(5),
  LOG_FORMAT: z.enum(['json', 'pretty']).default(CONFIG_DEFAULTS.LOG_FORMAT),
  LOG_ENABLE_METADATA: z.coerce.boolean().default(true),
  LOG_ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
  ENABLE_FILE_LOGGING_IN_DEV: z.coerce.boolean().default(false),

  // Loki Logging Configuration
  LOKI_URL: z.string().url().optional(),
  LOKI_USERNAME: z.string().optional(),
  LOKI_PASSWORD: z.string().optional(),
  LOKI_TIMEOUT: z.coerce.number().default(30000),

  // MQTT
  MQTT_HOST: z.string().default('localhost'),
  MQTT_PORT: z.coerce.number().default(CONFIG_DEFAULTS.MQTT_PORT),
  MQTT_SECURE_PORT: z.coerce.number().default(CONFIG_DEFAULTS.MQTT_SECURE_PORT),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().default('iot-hub-backend'),
  MQTT_KEEPALIVE: z.coerce.number().default(60),
  MQTT_CLEAN_SESSION: z.coerce.boolean().default(true),
  MQTT_RECONNECT_PERIOD: z.coerce.number().default(2000),
  MQTT_CONNECT_TIMEOUT: z.coerce.number().default(30000),
  MQTT_QOS: z.coerce.number().min(0).max(2).default(CONFIG_DEFAULTS.MQTT_QOS),
  MQTT_RETAIN: z.coerce.boolean().default(false),
  MQTT_WILL_TOPIC: z.string().optional(),
  MQTT_WILL_PAYLOAD: z.string().optional(),
  MQTT_WILL_QOS: z.coerce.number().min(0).max(2).default(0),
  MQTT_WILL_RETAIN: z.coerce.boolean().default(false),
  MQTT_MAX_RECONNECT_ATTEMPTS: z.coerce.number().default(10),

  // OpenTelemetry
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().default(CONFIG_DEFAULTS.OTEL_SERVICE_NAME),
  OTEL_SERVICE_VERSION: z
    .string()
    .default(CONFIG_DEFAULTS.OTEL_SERVICE_VERSION),
  OTEL_COLLECTOR_URL: z.string().url().default('http://localhost:4318'),
  OTEL_COLLECTOR_TRACES_ENDPOINT: z.string().optional(),
  OTEL_COLLECTOR_METRICS_ENDPOINT: z.string().optional(),
  OTEL_COLLECTOR_LOGS_ENDPOINT: z.string().optional(),
  OTEL_ENABLE_TRACING: z.coerce.boolean().default(true),
  OTEL_ENABLE_METRICS: z.coerce.boolean().default(true),
  OTEL_ENABLE_LOGGING: z.coerce.boolean().default(true),
  OTEL_METRICS_EXPORT_INTERVAL: z.coerce
    .number()
    .min(1000)
    .max(300000)
    .default(10000),
  OTEL_TRACES_SAMPLER: z
    .enum(['always_on', 'always_off', 'traceidratio', 'parentbased_always_on'])
    .default('parentbased_always_on'),
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().min(0).max(1).default(1.0),
  OTEL_DEBUG: z.coerce.boolean().default(false),
  OTEL_EXPORTER_TIMEOUT: z.coerce.number().min(1000).max(60000).default(5000),
  OTEL_BATCH_SIZE: z.coerce.number().min(1).max(512).default(10),
  OTEL_BATCH_TIMEOUT: z.coerce.number().min(100).max(10000).default(1000),
  OTEL_MAX_QUEUE_SIZE: z.coerce.number().min(10).max(2048).default(100),
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),

  // Devices
  DEVICE_TIMEOUT_MS: z.coerce
    .number()
    .min(1000)
    .default(CONFIG_DEFAULTS.DEVICE_TIMEOUT_MS),
  DEVICE_HEARTBEAT_INTERVAL_MS: z.coerce.number().min(1000).default(10000),
  MAX_DEVICES_PER_USER: z.coerce
    .number()
    .min(1)
    .default(CONFIG_DEFAULTS.MAX_DEVICES_PER_USER),
  CERTIFICATE_VALIDITY_DAYS: z.coerce.number().min(1).default(365),
  DEVICE_DATA_RETENTION_DAYS: z.coerce.number().min(1).default(30),

  // Users
  USER_SESSION_TIMEOUT_MS: z.coerce
    .number()
    .min(60000)
    .default(CONFIG_DEFAULTS.USER_SESSION_TIMEOUT_MS),
  MAX_ACTIVE_SESSIONS_PER_USER: z.coerce.number().min(1).default(5),
  ENABLE_USER_REGISTRATION: z.coerce.boolean().default(true),
  REQUIRE_EMAIL_VERIFICATION: z.coerce.boolean().default(true),
  USER_PROFILE_IMAGE_MAX_SIZE_BYTES: z.coerce
    .number()
    .min(1024)
    .default(2097152),
  PASSWORD_MIN_LENGTH: z.coerce.number().min(6).default(8),
  PASSWORD_REQUIRE_SPECIAL_CHARS: z.coerce.boolean().default(true),
});

export type ComposedConfig = z.infer<typeof composedConfigSchema>;

/**
 * Application configuration type - structured by domain
 */
export interface AppConfig {
  common: z.infer<typeof commonConfigSchema>;
  auth: z.infer<typeof authConfigSchema>;
  database: z.infer<typeof databaseConfigSchema>;
  mqtt: z.infer<typeof mqttConfigSchema>;
  telemetry: z.infer<typeof telemetryConfigSchema>;
  devices: z.infer<typeof devicesConfigSchema>;
  users: z.infer<typeof usersConfigSchema>;
}

/**
 * Create structured app config from validated environment
 */
export function createAppConfigFromEnv(env: ComposedConfig): AppConfig {
  return {
    common: {
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
      lokiEnabled: !!env.LOKI_URL,
      lokiUrl: env.LOKI_URL,
      lokiLabels: '', // Will be parsed in CommonConfigService
      lokiTimeout: env.LOKI_TIMEOUT,
      lokiSilenceErrors: true,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtExpiration: env.JWT_EXPIRATION,
      keycloakUrl: env.KEYCLOAK_URL,
      keycloakRealm: env.KEYCLOAK_REALM,
      keycloakClientId: env.KEYCLOAK_CLIENT_ID,
      oauth2ProxyUserHeader: env.OAUTH2_PROXY_USER_HEADER,
      oauth2ProxyEmailHeader: env.OAUTH2_PROXY_EMAIL_HEADER,
      oauth2ProxyPreferredUsernameHeader:
        env.OAUTH2_PROXY_PREFERRED_USERNAME_HEADER,
      oauth2ProxyAccessTokenHeader: env.OAUTH2_PROXY_ACCESS_TOKEN_HEADER,
      devUserId: env.DEV_USER_ID,
      devUserEmail: env.DEV_USER_EMAIL,
      devUserName: env.DEV_USER_NAME,
      devUserRole: env.DEV_USER_ROLE,
      devUserAvatar: env.DEV_USER_AVATAR,
      devUserEmailVerified: env.DEV_USER_EMAIL_VERIFIED,
    },
    database: {
      type: env.DB_TYPE,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      synchronize: env.DB_SYNCHRONIZE,
      logging: env.DB_LOGGING === 'true',
      dropSchema: env.DB_DROP_SCHEMA,
      cache: false,
      ssl: env.DB_SSL,
      extra: {
        connectionTimeoutMillis: 60000,
        max: env.DB_POOL_SIZE,
        min: 1,
        idleTimeoutMillis: 30000,
      },
    },
    mqtt: {
      brokerUrl: `mqtt://${env.MQTT_HOST}:${env.MQTT_PORT}`,
      host: env.MQTT_HOST,
      port: env.MQTT_PORT,
      securePort: env.MQTT_SECURE_PORT,
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      clientId: env.MQTT_CLIENT_ID,
      keepalive: env.MQTT_KEEPALIVE,
      clean: env.MQTT_CLEAN_SESSION,
      protocolVersion: 4,
      reconnectPeriod: env.MQTT_RECONNECT_PERIOD,
      connectTimeout: env.MQTT_CONNECT_TIMEOUT,
      rejectUnauthorized: true,
      qos: env.MQTT_QOS,
      retain: env.MQTT_RETAIN,
      maxReconnectAttempts: env.MQTT_MAX_RECONNECT_ATTEMPTS,
      will: env.MQTT_WILL_TOPIC
        ? {
            topic: env.MQTT_WILL_TOPIC,
            payload: env.MQTT_WILL_PAYLOAD,
            qos: env.MQTT_WILL_QOS,
            retain: env.MQTT_WILL_RETAIN,
          }
        : undefined,
      tls: undefined, // Will be configured separately when needed
    },
    telemetry: {
      otelEnabled: env.OTEL_ENABLED,
      otelServiceName: env.OTEL_SERVICE_NAME,
      otelServiceVersion: env.OTEL_SERVICE_VERSION,
      otelCollectorUrl: env.OTEL_COLLECTOR_URL,
      otelCollectorTracesEndpoint: env.OTEL_COLLECTOR_TRACES_ENDPOINT,
      otelCollectorMetricsEndpoint: env.OTEL_COLLECTOR_METRICS_ENDPOINT,
      otelCollectorLogsEndpoint: env.OTEL_COLLECTOR_LOGS_ENDPOINT,
      otelEnableTracing: env.OTEL_ENABLE_TRACING,
      otelEnableMetrics: env.OTEL_ENABLE_METRICS,
      otelEnableLogging: env.OTEL_ENABLE_LOGGING,
      otelMetricsExportInterval: env.OTEL_METRICS_EXPORT_INTERVAL,
      otelTracesSampler: env.OTEL_TRACES_SAMPLER,
      otelTracesSamplerRatio: env.OTEL_TRACES_SAMPLER_RATIO,
      otelDebug: env.OTEL_DEBUG,
      otelExporterTimeout: env.OTEL_EXPORTER_TIMEOUT,
      otelBatchSize: env.OTEL_BATCH_SIZE,
      otelBatchTimeout: env.OTEL_BATCH_TIMEOUT,
      otelMaxQueueSize: env.OTEL_MAX_QUEUE_SIZE,
      otelResourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES,
    },
    devices: {
      deviceTimeoutMs: env.DEVICE_TIMEOUT_MS,
      deviceHeartbeatIntervalMs: env.DEVICE_HEARTBEAT_INTERVAL_MS,
      maxDevicesPerUser: env.MAX_DEVICES_PER_USER,
      certificateValidityDays: env.CERTIFICATE_VALIDITY_DAYS,
      deviceDataRetentionDays: env.DEVICE_DATA_RETENTION_DAYS,
    },
    users: {
      userSessionTimeoutMs: env.USER_SESSION_TIMEOUT_MS,
      maxActiveSessionsPerUser: env.MAX_ACTIVE_SESSIONS_PER_USER,
      enableUserRegistration: env.ENABLE_USER_REGISTRATION,
      requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      userProfileImageMaxSizeBytes: env.USER_PROFILE_IMAGE_MAX_SIZE_BYTES,
      passwordMinLength: env.PASSWORD_MIN_LENGTH,
      passwordRequireSpecialChars: env.PASSWORD_REQUIRE_SPECIAL_CHARS,
    },
  };
}
