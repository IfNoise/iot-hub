import { z } from 'zod';

/**
 * OpenTelemetry configuration schema for microservices
 * Адаптировано для использования в микросервисах из основного backend
 */
export const telemetryConfigSchema = z.object({
  // OpenTelemetry Core Configuration
  otelEnabled: z.coerce
    .boolean()
    .default(true)
    .describe('Enable OpenTelemetry observability'),

  otelServiceName: z
    .string()
    .default('iot-hub-service')
    .describe(
      'OpenTelemetry service name - will be auto-detected from package.json'
    ),

  otelServiceVersion: z
    .string()
    .default('1.0.0')
    .describe(
      'OpenTelemetry service version - will be auto-detected from package.json'
    ),

  otelCollectorUrl: z
    .string()
    .url()
    .default('http://localhost:4318')
    .describe('OpenTelemetry Collector URL'),

  // Endpoints Configuration
  otelCollectorTracesEndpoint: z
    .string()
    .optional()
    .describe('OpenTelemetry Collector traces endpoint (overrides default)'),

  otelCollectorMetricsEndpoint: z
    .string()
    .optional()
    .describe('OpenTelemetry Collector metrics endpoint (overrides default)'),

  otelCollectorLogsEndpoint: z
    .string()
    .optional()
    .describe('OpenTelemetry Collector logs endpoint (overrides default)'),

  // Feature Toggles
  otelEnableTracing: z.coerce
    .boolean()
    .default(true)
    .describe('Enable OpenTelemetry tracing'),

  otelEnableMetrics: z.coerce
    .boolean()
    .default(true)
    .describe('Enable OpenTelemetry metrics collection'),

  otelEnableLogging: z.coerce
    .boolean()
    .default(true)
    .describe('Enable OpenTelemetry logging'),

  // Performance Configuration
  otelMetricsExportInterval: z.coerce
    .number()
    .min(1000)
    .max(300000)
    .default(10000)
    .describe('OpenTelemetry metrics export interval in milliseconds'),

  // Sampling Configuration
  otelTracesSampler: z
    .enum(['always_on', 'always_off', 'traceidratio', 'parentbased_always_on'])
    .default('parentbased_always_on')
    .describe('OpenTelemetry traces sampling strategy'),

  otelTracesSamplerRatio: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(1.0)
    .describe('OpenTelemetry traces sampling ratio (for traceidratio sampler)'),

  // Debug & Development
  otelDebug: z.coerce
    .boolean()
    .default(false)
    .describe('Enable OpenTelemetry debug logging'),

  // Export Configuration
  otelExporterTimeout: z.coerce
    .number()
    .min(1000)
    .max(60000)
    .default(5000)
    .describe('OpenTelemetry exporter timeout in milliseconds'),

  otelBatchSize: z.coerce
    .number()
    .min(1)
    .max(512)
    .default(10)
    .describe('OpenTelemetry batch export size'),

  otelBatchTimeout: z.coerce
    .number()
    .min(100)
    .max(10000)
    .default(1000)
    .describe('OpenTelemetry batch export timeout in milliseconds'),

  otelMaxQueueSize: z.coerce
    .number()
    .min(10)
    .max(2048)
    .default(100)
    .describe('OpenTelemetry maximum queue size'),

  // Resource Attributes
  otelResourceAttributes: z
    .string()
    .optional()
    .describe(
      'OpenTelemetry resource attributes (comma-separated key=value pairs)'
    ),
});

export type TelemetryConfig = z.infer<typeof telemetryConfigSchema>;
