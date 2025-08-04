import { z } from 'zod';
import { commonConfigSchema } from './common/common-config.schema.js';
import { authConfigSchema } from './auth/auth-config.schema.js';
import { databaseConfigSchema } from './database/database-config.schema.js';
import { telemetryConfigSchema } from './telemetry/telemetry-config.schema.js';
import { kafkaConfigSchema } from './kafka/kafka-config.schema.js';

// Environment variables schema - maps env vars to config sections
export const envConfigSchema = z.object({
  // Common/Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  // Database (Drizzle specific)
  DB_TYPE: z.enum(['postgres', 'mysql', 'sqlite']).default('postgres'),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_PASSWORD: z.string().min(8).max(64),
  DATABASE_USER: z.string().min(3).max(32),
  DATABASE_NAME: z.string().min(1).max(64),
  DATABASE_SSL: z.coerce.boolean().default(false),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().default(30000),

  // JWT & Auth
  JWT_SECRET: z.string().min(32).max(64),
  JWT_EXPIRATION: z.string().default('1h'),

  // Keycloak (если используется)
  KEYCLOAK_URL: z.string().url().optional().or(z.literal('')),
  KEYCLOAK_REALM: z.string().min(1).optional().or(z.literal('')),
  KEYCLOAK_CLIENT_ID: z.string().min(1).optional().or(z.literal('')),

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

  // Service Identity
  SERVICE_NAME: z.string().default('user-management'),
  SERVICE_VERSION: z.string().default('1.0.0'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default('./logs/user-management.log'),
  LOG_FILE_MAX_SIZE: z.string().default('10M'),
  LOG_FILE_MAX_FILES: z.coerce.number().default(5),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_ENABLE_METADATA: z.coerce.boolean().default(true),
  LOG_ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(true),
  ENABLE_FILE_LOGGING_IN_DEV: z.coerce.boolean().default(false),

  // Loki Configuration
  LOKI_ENABLED: z.coerce.boolean().default(false),
  LOKI_URL: z.string().url().optional(),
  LOKI_LABELS: z.string().optional(),
  LOKI_TIMEOUT: z.coerce.number().default(30000),
  LOKI_SILENCE_ERRORS: z.coerce.boolean().default(true),

  // OpenTelemetry
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().default('user-management'),
  OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .default('http://localhost:4318'),
  OTEL_ENABLE_TRACING: z.coerce.boolean().default(true),
  OTEL_ENABLE_METRICS: z.coerce.boolean().default(true),
  OTEL_ENABLE_LOGS: z.coerce.boolean().default(true),
  OTEL_EXPORTER_TIMEOUT: z.coerce.number().min(1000).max(60000).default(5000),
  OTEL_METRICS_EXPORT_INTERVAL: z.coerce
    .number()
    .min(1000)
    .max(300000)
    .default(10000),

  // Observability
  OBSERVABILITY_HEALTH_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_HEALTH_PATH: z.string().default('/health/observability'),
  OBSERVABILITY_METRICS_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_SYSTEM_METRICS_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_SYSTEM_METRICS_INTERVAL: z.coerce.number().default(30000),
  OBSERVABILITY_SLOW_QUERY_THRESHOLD: z.coerce.number().default(1000),
  OBSERVABILITY_SLOW_REQUEST_THRESHOLD: z.coerce.number().default(2000),
  OBSERVABILITY_ERROR_SAMPLING_RATE: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(1.0),
  OBSERVABILITY_STACK_TRACE_ENABLED: z.coerce.boolean().default(true),

  // Kafka Configuration
  KAFKA_ENABLED: z.coerce.boolean().default(true),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('user-management'),
  KAFKA_GROUP_ID: z.string().default('user-management-group'),
  KAFKAJS_NO_PARTITIONER_WARNING: z.coerce.number().optional(),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;

// Composed configuration type
export interface AppConfig {
  common: z.infer<typeof commonConfigSchema>;
  auth: z.infer<typeof authConfigSchema>;
  database: z.infer<typeof databaseConfigSchema>;
  telemetry: z.infer<typeof telemetryConfigSchema>;
  kafka: z.infer<typeof kafkaConfigSchema>;
}
