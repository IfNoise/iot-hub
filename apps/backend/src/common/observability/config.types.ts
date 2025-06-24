// OpenTelemetry Configuration Types
export interface OpenTelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  collectorUrl: string;
  endpoints: {
    traces: string;
    metrics: string;
    logs: string;
  };
  tracing: {
    enabled: boolean;
    sampler: 'always_on' | 'always_off' | 'traceidratio' | 'parentbased_always_on';
    samplerRatio: number;
  };
  metrics: {
    enabled: boolean;
    exportInterval: number;
  };
  logging: {
    enabled: boolean;
  };
  exporter: {
    timeout: number;
    batchSize: number;
    batchTimeout: number;
    maxQueueSize: number;
  };
  debug: boolean;
  resourceAttributes: Record<string, string>;
}

export interface OtelInstrumentationConfig {
  serviceName: string;
  collectorUrl: string;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableLogging: boolean;
  exportIntervalMs: number;
  debug: boolean;
  samplerType: string;
  samplerRatio: number;
  exporterTimeout: number;
  batchSize: number;
  batchTimeout: number;
  maxQueueSize: number;
  resourceAttributes: Record<string, string>;
}
