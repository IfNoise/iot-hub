import { Injectable, Logger } from '@nestjs/common';
import type { TelemetryConfig } from '../types/index.js';

/**
 * OpenTelemetry service implementation for microservices
 * Follows Contract First principles with Zod validation
 */
@Injectable()
export class OtelService {
  private readonly logger = new Logger(OtelService.name);
  private config: TelemetryConfig;

  constructor(config: TelemetryConfig) {
    this.config = config;
  }

  /**
   * Initialize OpenTelemetry
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.otelEnabled) {
        this.logger.log(
          `📊 OpenTelemetry инициализирован для сервиса: ${this.config.otelServiceName}`
        );
        this.logger.log(`📍 Collector URL: ${this.config.otelCollectorUrl}`);
        this.logger.log(
          `📊 Метрики: ${
            this.config.otelEnableMetrics ? 'включены' : 'отключены'
          }`
        );
        this.logger.log(
          `🔄 Трейсы: ${
            this.config.otelEnableTracing ? 'включены' : 'отключены'
          }`
        );
        this.logger.log(
          `📝 Логи: ${this.config.otelEnableLogging ? 'включены' : 'отключены'}`
        );
      } else {
        this.logger.warn('📊 OpenTelemetry отключен');
      }
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации OpenTelemetry:', error);
      if (this.config.otelEnabled) {
        throw error;
      }
    }
  }

  /**
   * Check if OpenTelemetry is enabled
   */
  isEnabled(): boolean {
    return this.config.otelEnabled;
  }

  /**
   * Get OpenTelemetry endpoints
   */
  getEndpoints() {
    const baseUrl = this.config.otelCollectorUrl;
    return {
      traces: `${baseUrl}/v1/traces`,
      metrics: `${baseUrl}/v1/metrics`,
      logs: `${baseUrl}/v1/logs`,
    };
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.config.otelServiceName;
  }

  /**
   * Get collector URL
   */
  getCollectorUrl(): string {
    return this.config.otelCollectorUrl;
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.config.otelEnabled && this.config.otelEnableTracing;
  }

  /**
   * Check if metrics are enabled
   */
  isMetricsEnabled(): boolean {
    return this.config.otelEnabled && this.config.otelEnableMetrics;
  }

  /**
   * Check if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.config.otelEnabled && this.config.otelEnableLogging;
  }

  /**
   * Get resource attributes
   */
  getResourceAttributes(): Record<string, string> {
    // Parse resource attributes from string to object
    const attrs: Record<string, string> = {};
    if (this.config.otelResourceAttributes) {
      const pairs = this.config.otelResourceAttributes.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          attrs[key.trim()] = value.trim();
        }
      }
    }
    return attrs;
  }

  /**
   * Get sampler configuration
   */
  getSamplerConfig() {
    return {
      type: this.config.otelTracesSampler,
      ratio: this.config.otelTracesSamplerRatio,
    };
  }

  /**
   * Get exporter configuration
   */
  getExporterConfig() {
    return {
      timeout: this.config.otelExporterTimeout,
      batchSize: this.config.otelBatchSize,
      batchTimeout: this.config.otelBatchTimeout,
      maxQueueSize: this.config.otelMaxQueueSize,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): TelemetryConfig {
    return this.config;
  }

  /**
   * Get configuration summary for health checks
   */
  getConfigSummary() {
    return {
      enabled: this.config.otelEnabled,
      serviceName: this.config.otelServiceName,
      collectorUrl: this.config.otelCollectorUrl,
      tracing: this.config.otelEnableTracing,
      metrics: this.config.otelEnableMetrics,
      logging: this.config.otelEnableLogging,
      endpoints: this.getEndpoints(),
    };
  }
}
