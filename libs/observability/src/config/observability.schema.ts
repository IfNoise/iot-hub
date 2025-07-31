import { z } from 'zod';
import { telemetryConfigSchema } from './telemetry.schema.js';
import { loggingConfigSchema } from './logging.schema.js';

/**
 * Общая схема конфигурации observability для микросервисов
 * Объединяет телеметрию и логирование
 */
export const observabilityConfigSchema = z.object({
  // Service Identity (автоматически определяется)
  serviceName: z
    .string()
    .default('iot-hub-service')
    .describe('Service name - auto-detected from package.json'),

  serviceVersion: z
    .string()
    .default('1.0.0')
    .describe('Service version - auto-detected from package.json'),

  environment: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),

  // Health Check Configuration
  healthCheckEnabled: z.coerce
    .boolean()
    .default(true)
    .describe('Enable observability health checks'),

  healthCheckPath: z
    .string()
    .default('/health/observability')
    .describe('Health check endpoint path'),

  // Metrics Collection
  metricsEnabled: z.coerce
    .boolean()
    .default(true)
    .describe('Enable custom metrics collection'),

  systemMetricsEnabled: z.coerce
    .boolean()
    .default(true)
    .describe('Enable system metrics collection (memory, CPU)'),

  systemMetricsInterval: z.coerce
    .number()
    .min(5000)
    .max(300000)
    .default(30000)
    .describe('System metrics collection interval in milliseconds'),

  // Performance Monitoring
  slowQueryThreshold: z.coerce
    .number()
    .min(100)
    .default(1000)
    .describe('Threshold for marking queries as slow (milliseconds)'),

  slowRequestThreshold: z.coerce
    .number()
    .min(100)
    .default(2000)
    .describe('Threshold for marking HTTP requests as slow (milliseconds)'),

  // Error Tracking
  errorSamplingRate: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(1.0)
    .describe('Sampling rate for error tracking (0-1)'),

  enableStackTraceCapture: z.coerce
    .boolean()
    .default(true)
    .describe('Capture stack traces for errors'),

  // Telemetry & Logging
  telemetry: telemetryConfigSchema,
  logging: loggingConfigSchema,
});

export type ObservabilityConfig = z.infer<typeof observabilityConfigSchema>;

/**
 * Схема environment переменных для observability
 * Маппинг из ENV vars в конфигурацию
 */
export const observabilityEnvSchema = z.object({
  // Environment Detection
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Service Identity (optional, will be auto-detected)
  SERVICE_NAME: z.string().optional(),
  SERVICE_VERSION: z.string().optional(),

  // Health Checks
  OBSERVABILITY_HEALTH_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_HEALTH_PATH: z.string().default('/health/observability'),

  // Metrics
  OBSERVABILITY_METRICS_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_SYSTEM_METRICS_ENABLED: z.coerce.boolean().default(true),
  OBSERVABILITY_SYSTEM_METRICS_INTERVAL: z.coerce.number().default(30000),

  // Performance
  OBSERVABILITY_SLOW_QUERY_THRESHOLD: z.coerce.number().default(1000),
  OBSERVABILITY_SLOW_REQUEST_THRESHOLD: z.coerce.number().default(2000),

  // Error Tracking
  OBSERVABILITY_ERROR_SAMPLING_RATE: z.coerce.number().default(1.0),
  OBSERVABILITY_STACK_TRACE_ENABLED: z.coerce.boolean().default(true),

  // Logging Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
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
  LOKI_USERNAME: z.string().optional(),
  LOKI_PASSWORD: z.string().optional(),

  // OpenTelemetry Configuration
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_SERVICE_VERSION: z.string().optional(),
  OTEL_COLLECTOR_URL: z.string().url().default('http://localhost:4318'),
  OTEL_COLLECTOR_TRACES_ENDPOINT: z.string().optional(),
  OTEL_COLLECTOR_METRICS_ENDPOINT: z.string().optional(),
  OTEL_COLLECTOR_LOGS_ENDPOINT: z.string().optional(),
  OTEL_ENABLE_TRACING: z.coerce.boolean().default(true),
  OTEL_ENABLE_METRICS: z.coerce.boolean().default(true),
  OTEL_ENABLE_LOGGING: z.coerce.boolean().default(true),
  OTEL_METRICS_EXPORT_INTERVAL: z.coerce.number().default(10000),
  OTEL_TRACES_SAMPLER: z
    .enum(['always_on', 'always_off', 'traceidratio', 'parentbased_always_on'])
    .default('parentbased_always_on'),
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().min(0).max(1).default(1.0),
  OTEL_DEBUG: z.coerce.boolean().default(false),
  OTEL_EXPORTER_TIMEOUT: z.coerce.number().default(5000),
  OTEL_BATCH_SIZE: z.coerce.number().default(10),
  OTEL_BATCH_TIMEOUT: z.coerce.number().default(1000),
  OTEL_MAX_QUEUE_SIZE: z.coerce.number().default(100),
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),
});

export type ObservabilityEnvConfig = z.infer<typeof observabilityEnvSchema>;
