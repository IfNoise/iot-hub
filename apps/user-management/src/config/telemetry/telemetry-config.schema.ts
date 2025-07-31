import { z } from 'zod';

export const telemetryConfigSchema = z.object({
  // OpenTelemetry Core
  enabled: z.coerce.boolean().default(true),
  serviceName: z.string().default('user-management'),
  serviceVersion: z.string().default('1.0.0'),

  // OTLP Exporter
  exporterOtlpEndpoint: z.string().url().default('http://localhost:4318'),
  exporterTimeout: z.coerce.number().min(1000).max(60000).default(5000),

  // Feature Toggles
  enableTracing: z.coerce.boolean().default(true),
  enableMetrics: z.coerce.boolean().default(true),
  enableLogs: z.coerce.boolean().default(true),

  // Metrics
  metricsExportInterval: z.coerce.number().min(1000).max(300000).default(10000),

  // Observability Features
  healthEnabled: z.coerce.boolean().default(true),
  healthPath: z.string().default('/health/observability'),
  metricsEnabled: z.coerce.boolean().default(true),
  systemMetricsEnabled: z.coerce.boolean().default(true),
  systemMetricsInterval: z.coerce.number().default(30000),

  // Performance Monitoring
  slowQueryThreshold: z.coerce.number().default(1000),
  slowRequestThreshold: z.coerce.number().default(2000),

  // Error Tracking
  errorSamplingRate: z.coerce.number().min(0).max(1).default(1.0),
  stackTraceEnabled: z.coerce.boolean().default(true),
});

export type TelemetryConfig = z.infer<typeof telemetryConfigSchema>;

// OpenTelemetry specific configuration interface
export interface OpenTelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  exporterOtlpEndpoint: string;
  exporterTimeout: number;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableLogs: boolean;
  metricsExportInterval: number;
}
