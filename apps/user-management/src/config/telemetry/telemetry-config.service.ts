import { Injectable } from '@nestjs/common';
import {
  telemetryConfigSchema,
  TelemetryConfig,
  OpenTelemetryConfig,
} from './telemetry-config.schema.js';

@Injectable()
export class TelemetryConfigService {
  private readonly config: TelemetryConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = telemetryConfigSchema.parse({
      enabled: env.OTEL_ENABLED,
      serviceName: env.OTEL_SERVICE_NAME || env.SERVICE_NAME,
      serviceVersion: env.OTEL_SERVICE_VERSION || env.SERVICE_VERSION,
      exporterOtlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      exporterTimeout: env.OTEL_EXPORTER_TIMEOUT,
      enableTracing: env.OTEL_ENABLE_TRACING,
      enableMetrics: env.OTEL_ENABLE_METRICS,
      enableLogs: env.OTEL_ENABLE_LOGS,
      metricsExportInterval: env.OTEL_METRICS_EXPORT_INTERVAL,
      healthEnabled: env.OBSERVABILITY_HEALTH_ENABLED,
      healthPath: env.OBSERVABILITY_HEALTH_PATH,
      metricsEnabled: env.OBSERVABILITY_METRICS_ENABLED,
      systemMetricsEnabled: env.OBSERVABILITY_SYSTEM_METRICS_ENABLED,
      systemMetricsInterval: env.OBSERVABILITY_SYSTEM_METRICS_INTERVAL,
      slowQueryThreshold: env.OBSERVABILITY_SLOW_QUERY_THRESHOLD,
      slowRequestThreshold: env.OBSERVABILITY_SLOW_REQUEST_THRESHOLD,
      errorSamplingRate: env.OBSERVABILITY_ERROR_SAMPLING_RATE,
      stackTraceEnabled: env.OBSERVABILITY_STACK_TRACE_ENABLED,
    });
  }

  get<T extends keyof TelemetryConfig>(key: T): TelemetryConfig[T] {
    return this.config[key];
  }

  getAll(): TelemetryConfig {
    return this.config;
  }

  // OpenTelemetry configuration
  getOpenTelemetryConfig(): OpenTelemetryConfig {
    return {
      enabled: this.config.enabled,
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      exporterOtlpEndpoint: this.config.exporterOtlpEndpoint,
      exporterTimeout: this.config.exporterTimeout,
      enableTracing: this.config.enableTracing,
      enableMetrics: this.config.enableMetrics,
      enableLogs: this.config.enableLogs,
      metricsExportInterval: this.config.metricsExportInterval,
    };
  }

  // Observability configuration
  getObservabilityConfig() {
    return {
      healthEnabled: this.config.healthEnabled,
      healthPath: this.config.healthPath,
      metricsEnabled: this.config.metricsEnabled,
      systemMetricsEnabled: this.config.systemMetricsEnabled,
      systemMetricsInterval: this.config.systemMetricsInterval,
    };
  }

  // Performance monitoring configuration
  getPerformanceConfig() {
    return {
      slowQueryThreshold: this.config.slowQueryThreshold,
      slowRequestThreshold: this.config.slowRequestThreshold,
      errorSamplingRate: this.config.errorSamplingRate,
      stackTraceEnabled: this.config.stackTraceEnabled,
    };
  }

  // Feature checks
  isEnabled(): boolean {
    return this.config.enabled;
  }

  isTracingEnabled(): boolean {
    return this.config.enabled && this.config.enableTracing;
  }

  isMetricsEnabled(): boolean {
    return this.config.enabled && this.config.enableMetrics;
  }

  isLogsEnabled(): boolean {
    return this.config.enabled && this.config.enableLogs;
  }
}
