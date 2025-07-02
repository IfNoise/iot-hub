import { Injectable } from '@nestjs/common';
import { telemetryConfigSchema, TelemetryConfig } from './telemetry-config.schema.js';
import type { OpenTelemetryConfig } from '../observability/config.types.js';

@Injectable()
export class TelemetryConfigService {
  private readonly config: TelemetryConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = telemetryConfigSchema.parse({
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
    });
  }

  get<T extends keyof TelemetryConfig>(key: T): TelemetryConfig[T] {
    return this.config[key];
  }

  getAll(): TelemetryConfig {
    return this.config;
  }

  // Convenience methods
  isEnabled(): boolean {
    return this.config.otelEnabled;
  }

  getOpenTelemetryConfig(): OpenTelemetryConfig {
    return {
      enabled: this.config.otelEnabled,
      serviceName: this.config.otelServiceName,
      serviceVersion: this.config.otelServiceVersion,
      collectorUrl: this.config.otelCollectorUrl,
      endpoints: {
        traces: this.config.otelCollectorTracesEndpoint || `${this.config.otelCollectorUrl}/v1/traces`,
        metrics: this.config.otelCollectorMetricsEndpoint || `${this.config.otelCollectorUrl}/v1/metrics`,
        logs: this.config.otelCollectorLogsEndpoint || `${this.config.otelCollectorUrl}/v1/logs`,
      },
      tracing: {
        enabled: this.config.otelEnableTracing,
        sampler: (this.config.otelTracesSampler || 'parentbased_always_on') as 'always_on' | 'always_off' | 'traceidratio' | 'parentbased_always_on',
        samplerRatio: this.config.otelTracesSamplerRatio,
      },
      metrics: {
        enabled: this.config.otelEnableMetrics,
        exportInterval: this.config.otelMetricsExportInterval,
      },
      logging: {
        enabled: this.config.otelEnableLogging,
      },
      exporter: {
        timeout: this.config.otelExporterTimeout,
        batchSize: this.config.otelBatchSize,
        batchTimeout: this.config.otelBatchTimeout,
        maxQueueSize: this.config.otelMaxQueueSize,
      },
      debug: this.config.otelDebug,
      resourceAttributes: this.parseResourceAttributes(this.config.otelResourceAttributes),
    };
  }

  private parseResourceAttributes(attributes?: string): Record<string, string> {
    if (!attributes) {
      return {};
    }
    
    try {
      const result: Record<string, string> = {};
      const pairs = attributes.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  getServiceInfo() {
    return {
      name: this.config.otelServiceName,
      version: this.config.otelServiceVersion,
    };
  }

  getCollectorConfig() {
    return {
      url: this.config.otelCollectorUrl,
      tracesEndpoint: this.config.otelCollectorTracesEndpoint,
      metricsEndpoint: this.config.otelCollectorMetricsEndpoint,
      logsEndpoint: this.config.otelCollectorLogsEndpoint,
    };
  }

  getBatchConfig() {
    return {
      size: this.config.otelBatchSize,
      timeout: this.config.otelBatchTimeout,
      maxQueueSize: this.config.otelMaxQueueSize,
    };
  }
}
