import { z } from 'zod';
import { commonConfigSchema } from '../common/config/common-config.schema.js';
import { authConfigSchema } from '../auth/config/auth-config.schema.js';
import { databaseConfigSchema } from '../database/config/database-config.schema.js';
import { telemetryConfigSchema } from '../common/config/telemetry-config.schema.js';
import { devicesConfigSchema } from '../devices/config/devices-config.schema.js';
import { usersConfigSchema } from '../users/config/users-config.schema.js';

// Environment variables schema - maps env vars to config sections
export const envConfigSchema = z.object({
  // Common/Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DB_TYPE: z
    .enum(['postgres', 'mysql', 'mariadb', 'cockroachdb', 'mongodb'])
    .default('postgres'),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_PASSWORD: z.string().min(8).max(64),
  DATABASE_USER: z.string().min(3).max(32),
  DATABASE_NAME: z.string().min(1).max(64),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.string().default('false'),
  DB_DROP_SCHEMA: z.coerce.boolean().default(false),
  DB_SSL: z.coerce.boolean().default(false),
  DB_POOL_SIZE: z.coerce.number().default(10),

  // JWT & Auth
  JWT_SECRET: z.string().min(32).max(64),
  JWT_EXPIRATION: z.string().default('1h'),

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
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  LOG_FILE_MAX_SIZE: z.string().default('10M'),
  LOG_FILE_MAX_FILES: z.coerce.number().default(5),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_ENABLE_METADATA: z.coerce.boolean().default(true),
  LOG_ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
  ENABLE_FILE_LOGGING_IN_DEV: z.coerce.boolean().default(false),

    // Loki Logging Configuration
  LOKI_URL: z.string().url().optional(),
  LOKI_USERNAME: z.string().optional(),
  LOKI_PASSWORD: z.string().optional(),
  LOKI_TIMEOUT: z.coerce.number().default(30000),

  // OpenTelemetry

  // OpenTelemetry
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().default('iot-hub-backend'),
  OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
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
  DEVICE_TIMEOUT_MS: z.coerce.number().min(1000).default(30000),
  DEVICE_HEARTBEAT_INTERVAL_MS: z.coerce.number().min(1000).default(10000),
  MAX_DEVICES_PER_USER: z.coerce.number().min(1).default(100),
  CERTIFICATE_VALIDITY_DAYS: z.coerce.number().min(1).default(365),
  DEVICE_DATA_RETENTION_DAYS: z.coerce.number().min(1).default(30),
  BROKER_HOST: z.string().default('localhost'),
  BROKER_SECURE_PORT: z.coerce.number().min(1).max(65535).default(8883),

  // Users
  USER_SESSION_TIMEOUT_MS: z.coerce.number().min(60000).default(3600000),
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

export type EnvConfig = z.infer<typeof envConfigSchema>;

// Composed configuration type
export interface AppConfig {
  common: z.infer<typeof commonConfigSchema>;
  auth: z.infer<typeof authConfigSchema>;
  database: z.infer<typeof databaseConfigSchema>;
  telemetry: z.infer<typeof telemetryConfigSchema>;
  devices: z.infer<typeof devicesConfigSchema>;
  users: z.infer<typeof usersConfigSchema>;
}
