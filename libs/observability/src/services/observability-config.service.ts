import { Injectable } from '@nestjs/common';
import * as path from 'path';
import {
  observabilityConfigSchema,
  observabilityEnvSchema,
  type ObservabilityConfig,
  type ObservabilityEnvConfig,
} from '../config/observability.schema.js';
import type { ServiceInfo } from '../types/index.js';

/**
 * Configuration service for observability
 * Автоматически определяет информацию о сервисе и настраивает observability
 */
@Injectable()
export class ObservabilityConfigService {
  private config: ObservabilityConfig;
  private envConfig: ObservabilityEnvConfig;
  private serviceInfo: ServiceInfo;

  constructor() {
    this.envConfig = observabilityEnvSchema.parse(process.env);
    this.serviceInfo = this.detectServiceInfo();
    this.config = this.buildConfig();
  }

  /**
   * Автоматически определяет информацию о сервисе из package.json
   */
  private detectServiceInfo(): ServiceInfo {
    try {
      // Ищем package.json начиная с текущей директории
      const packageJsonPath = this.findPackageJson();
      if (!packageJsonPath) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(
        require('fs').readFileSync(packageJsonPath, 'utf8')
      );

      return {
        name:
          this.envConfig.SERVICE_NAME || packageJson.name || 'unknown-service',
        version:
          this.envConfig.SERVICE_VERSION || packageJson.version || '1.0.0',
        description: packageJson.description,
        environment: this.envConfig.NODE_ENV,
        startedAt: new Date(),
      };
    } catch {
      // Fallback для случаев, когда package.json недоступен
      return {
        name: this.envConfig.SERVICE_NAME || 'unknown-service',
        version: this.envConfig.SERVICE_VERSION || '1.0.0',
        environment: this.envConfig.NODE_ENV,
        startedAt: new Date(),
      };
    }
  }

  /**
   * Ищет package.json в текущей или родительских директориях
   */
  private findPackageJson(): string | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (require('fs').existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Создает конфигурацию observability
   */
  private buildConfig(): ObservabilityConfig {
    const config = {
      // Service Identity
      serviceName: this.serviceInfo.name,
      serviceVersion: this.serviceInfo.version,
      environment: this.serviceInfo.environment,

      // Health Check Configuration
      healthCheckEnabled: this.envConfig.OBSERVABILITY_HEALTH_ENABLED,
      healthCheckPath: this.envConfig.OBSERVABILITY_HEALTH_PATH,

      // Metrics Collection
      metricsEnabled: this.envConfig.OBSERVABILITY_METRICS_ENABLED,
      systemMetricsEnabled: this.envConfig.OBSERVABILITY_SYSTEM_METRICS_ENABLED,
      systemMetricsInterval:
        this.envConfig.OBSERVABILITY_SYSTEM_METRICS_INTERVAL,

      // Performance Monitoring
      slowQueryThreshold: this.envConfig.OBSERVABILITY_SLOW_QUERY_THRESHOLD,
      slowRequestThreshold: this.envConfig.OBSERVABILITY_SLOW_REQUEST_THRESHOLD,

      // Error Tracking
      errorSamplingRate: this.envConfig.OBSERVABILITY_ERROR_SAMPLING_RATE,
      stackTraceEnabled: this.envConfig.OBSERVABILITY_STACK_TRACE_ENABLED,

      // Telemetry Configuration
      telemetry: {
        otelEnabled: this.envConfig.OTEL_ENABLED,
        otelServiceName: this.serviceInfo.name,
        otelServiceVersion: this.serviceInfo.version,
        otelCollectorUrl: this.envConfig.OTEL_COLLECTOR_URL,
        otelEnableTracing: this.envConfig.OTEL_ENABLE_TRACING,
        otelEnableMetrics: this.envConfig.OTEL_ENABLE_METRICS,
        otelEnableLogging: this.envConfig.OTEL_ENABLE_LOGGING,
        otelMetricsExportInterval: this.envConfig.OTEL_METRICS_EXPORT_INTERVAL,
        otelTracesSampler: this.envConfig.OTEL_TRACES_SAMPLER,
        otelTracesSamplerRatio: this.envConfig.OTEL_TRACES_SAMPLER_RATIO,
        otelDebug: this.envConfig.OTEL_DEBUG,
        otelExporterTimeout: this.envConfig.OTEL_EXPORTER_TIMEOUT,
        otelBatchTimeout: this.envConfig.OTEL_BATCH_TIMEOUT,
        otelBatchSize: this.envConfig.OTEL_BATCH_SIZE,
        otelMaxQueueSize: this.envConfig.OTEL_MAX_QUEUE_SIZE,
        otelCollectorMetricsEndpoint:
          this.envConfig.OTEL_COLLECTOR_METRICS_ENDPOINT,
        otelCollectorTracesEndpoint:
          this.envConfig.OTEL_COLLECTOR_TRACES_ENDPOINT,
        otelCollectorLogsEndpoint: this.envConfig.OTEL_COLLECTOR_LOGS_ENDPOINT,
        otelResourceAttributes: this.envConfig.OTEL_RESOURCE_ATTRIBUTES,
      },

      // Logging Configuration
      logging: {
        logLevel: this.envConfig.LOG_LEVEL,
        logToFile: this.envConfig.LOG_TO_FILE,
        logFilePath: this.envConfig.LOG_FILE_PATH,
        logFileMaxSize: this.envConfig.LOG_FILE_MAX_SIZE,
        logFileMaxFiles: this.envConfig.LOG_FILE_MAX_FILES,
        logFormat: this.envConfig.LOG_FORMAT,
        logEnableMetadata: this.envConfig.LOG_ENABLE_METADATA,
        logEnableRequestLogging: this.envConfig.LOG_ENABLE_REQUEST_LOGGING,
        enableFileLoggingInDev: this.envConfig.ENABLE_FILE_LOGGING_IN_DEV,
        lokiEnabled: this.envConfig.LOKI_ENABLED,
        lokiUrl: this.envConfig.LOKI_URL,
        lokiLabels: this.envConfig.LOKI_LABELS,
        lokiTimeout: this.envConfig.LOKI_TIMEOUT,
        lokiSilenceErrors: this.envConfig.LOKI_SILENCE_ERRORS,
        lokiUsername: this.envConfig.LOKI_USERNAME,
        lokiPassword: this.envConfig.LOKI_PASSWORD,
      },
    };

    return observabilityConfigSchema.parse(config);
  }

  /**
   * Возвращает полную конфигурацию observability
   */
  getConfig(): ObservabilityConfig {
    return this.config;
  }

  /**
   * Возвращает конфигурацию телеметрии
   */
  getTelemetryConfig() {
    return this.config.telemetry;
  }

  /**
   * Возвращает конфигурацию логирования
   */
  getLoggingConfig() {
    return this.config.logging;
  }

  /**
   * Возвращает информацию о сервисе
   */
  getServiceInfo(): ServiceInfo {
    return this.serviceInfo;
  }

  /**
   * Проверяет, включена ли OpenTelemetry
   */
  isOtelEnabled(): boolean {
    return this.config.telemetry.otelEnabled;
  }

  /**
   * Проверяет, включено ли логирование в Loki
   */
  isLokiEnabled(): boolean {
    return this.config.logging.lokiEnabled;
  }

  /**
   * Проверяет, включена ли определенная возможность observability
   */
  isEnabled(
    feature: 'telemetry' | 'metrics' | 'tracing' | 'logging' | 'loki'
  ): boolean {
    switch (feature) {
      case 'telemetry':
        return this.config.telemetry.otelEnabled;
      case 'metrics':
        return (
          this.config.telemetry.otelEnabled &&
          this.config.telemetry.otelEnableMetrics
        );
      case 'tracing':
        return (
          this.config.telemetry.otelEnabled &&
          this.config.telemetry.otelEnableTracing
        );
      case 'logging':
        return (
          this.config.telemetry.otelEnabled &&
          this.config.telemetry.otelEnableLogging
        );
      case 'loki':
        return this.config.logging.lokiEnabled;
      default:
        return false;
    }
  }

  /**
   * Возвращает метки (labels) для логирования в Loki
   */
  getLokiLabels(): Record<string, string> {
    const baseLabels = {
      service: this.serviceInfo.name,
      version: this.serviceInfo.version,
      environment: this.serviceInfo.environment,
    };

    const lokiLabels = this.config.logging.lokiLabels;
    if (!lokiLabels) {
      return baseLabels;
    }

    const customLabels: Record<string, string> = {};
    lokiLabels.split(',').forEach((pair) => {
      const [key, value] = pair.trim().split('=');
      if (key && value) {
        customLabels[key.trim()] = value.trim();
      }
    });

    return { ...baseLabels, ...customLabels };
  }
}
