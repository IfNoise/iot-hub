import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { ObservabilityConfigService } from './observability-config.service.js';
import type {
  MetricLabels,
  ServiceMetrics,
  ApiMetrics,
  DatabaseMetrics,
  ErrorMetrics,
  AuthMetrics,
  BusinessMetrics,
  KafkaMetrics,
  MqttMetrics,
  DeviceMetrics,
} from '../types/index.js';

/**
 * Unified metrics service for all microservices
 * Предоставляет единый интерфейс для сбора метрик во всех микросервисах
 */
@Injectable()
export class MetricsService {
  private readonly meter = metrics.getMeter('iot-hub-microservices', '1.0.0');
  private readonly serviceInfo: ServiceMetrics;

  // === Base Metrics Instruments ===
  private readonly apiRequestsCounter = this.meter.createCounter(
    'http_requests_total',
    {
      description: 'Total number of HTTP requests',
    }
  );

  private readonly apiResponseTimeHistogram = this.meter.createHistogram(
    'http_request_duration_ms',
    {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
    }
  );

  private readonly databaseOperationsCounter = this.meter.createCounter(
    'database_operations_total',
    {
      description: 'Total number of database operations',
    }
  );

  private readonly databaseQueryTimeHistogram = this.meter.createHistogram(
    'database_query_duration_ms',
    {
      description: 'Database query duration in milliseconds',
      unit: 'ms',
    }
  );

  private readonly errorsCounter = this.meter.createCounter('errors_total', {
    description: 'Total number of errors by type',
  });

  private readonly authAttemptsCounter = this.meter.createCounter(
    'auth_attempts_total',
    {
      description: 'Total authentication attempts',
    }
  );

  // === Business Logic Metrics ===
  private readonly businessOperationsCounter = this.meter.createCounter(
    'business_operations_total',
    {
      description: 'Total number of business operations',
    }
  );

  private readonly businessOperationTimeHistogram = this.meter.createHistogram(
    'business_operation_duration_ms',
    {
      description: 'Business operation duration in milliseconds',
      unit: 'ms',
    }
  );

  // === Kafka Metrics ===
  private readonly kafkaMessagesCounter = this.meter.createCounter(
    'kafka_messages_total',
    {
      description: 'Total number of Kafka messages produced/consumed',
    }
  );

  private readonly kafkaProcessingTimeHistogram = this.meter.createHistogram(
    'kafka_message_processing_duration_ms',
    {
      description: 'Kafka message processing time in milliseconds',
      unit: 'ms',
    }
  );

  // === MQTT Metrics (for device-simulator) ===
  private readonly mqttMessagesCounter = this.meter.createCounter(
    'mqtt_messages_total',
    {
      description: 'Total number of MQTT messages',
    }
  );

  private readonly mqttProcessingTimeHistogram = this.meter.createHistogram(
    'mqtt_message_processing_duration_ms',
    {
      description: 'MQTT message processing time in milliseconds',
      unit: 'ms',
    }
  );

  // === Device Metrics (for device-simulator) ===
  private readonly deviceConnectionsCounter = this.meter.createCounter(
    'device_connections_total',
    {
      description: 'Total number of device connections',
    }
  );

  private readonly activeDevicesGauge = this.meter.createUpDownCounter(
    'active_devices',
    {
      description: 'Number of currently active devices',
    }
  );

  constructor(private readonly configService: ObservabilityConfigService) {
    const serviceInfo = this.configService.getServiceInfo();
    this.serviceInfo = {
      serviceName: serviceInfo.name,
      serviceVersion: serviceInfo.version,
      environment: serviceInfo.environment,
    };
  }

  // === API Metrics ===
  recordApiRequest(metrics: ApiMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      method: metrics.method,
      endpoint: metrics.endpoint,
      status_code: metrics.statusCode.toString(),
      user_id: metrics.userId || 'anonymous',
    };

    this.apiRequestsCounter.add(1, labels);
    this.apiResponseTimeHistogram.record(metrics.durationMs, labels);
  }

  // === Database Metrics ===
  recordDatabaseOperation(metrics: DatabaseMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      operation: metrics.operation,
      table: metrics.table,
      success: metrics.success.toString(),
      query_type: metrics.queryType || 'OTHER',
    };

    this.databaseOperationsCounter.add(1, labels);
    this.databaseQueryTimeHistogram.record(metrics.durationMs, labels);
  }

  // === Error Metrics ===
  recordError(metrics: ErrorMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      error_type: metrics.errorType,
      operation: metrics.operation,
      severity: metrics.severity,
      user_id: metrics.userId || 'unknown',
    };

    this.errorsCounter.add(1, labels);
  }

  // === Authentication Metrics ===
  recordAuthAttempt(metrics: AuthMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      method: metrics.method,
      success: metrics.success.toString(),
      user_id: metrics.userId || 'anonymous',
      error_type: metrics.errorType || 'none',
    };

    this.authAttemptsCounter.add(1, labels);
  }

  // === Business Metrics ===
  recordBusinessOperation(metrics: BusinessMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      operation: metrics.operation,
      entity_type: metrics.entityType,
      success: metrics.success.toString(),
      user_id: metrics.userId || 'system',
    };

    this.businessOperationsCounter.add(1, labels);
    if (metrics.durationMs !== undefined) {
      this.businessOperationTimeHistogram.record(metrics.durationMs, labels);
    }
  }

  // === Kafka Metrics ===
  recordKafkaMessage(metrics: KafkaMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      operation: metrics.operation,
      topic: metrics.topic,
      success: metrics.success.toString(),
      consumer_group: metrics.consumerGroup || 'unknown',
    };

    this.kafkaMessagesCounter.add(1, labels);
    if (metrics.durationMs !== undefined) {
      this.kafkaProcessingTimeHistogram.record(metrics.durationMs, labels);
    }
  }

  // === MQTT Metrics (for device-simulator) ===
  recordMqttMessage(metrics: MqttMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      message_type: metrics.messageType,
      topic: metrics.topic,
      success: metrics.success.toString(),
      device_id: metrics.deviceId || 'unknown',
    };

    this.mqttMessagesCounter.add(1, labels);
    this.mqttProcessingTimeHistogram.record(metrics.durationMs, labels);
  }

  // === Device Metrics (for device-simulator) ===
  recordDeviceConnection(metrics: DeviceMetrics) {
    const labels = {
      service: metrics.serviceName || this.serviceInfo.serviceName,
      version: metrics.serviceVersion || this.serviceInfo.serviceVersion,
      environment: metrics.environment || this.serviceInfo.environment,
      device_id: metrics.deviceId,
      device_type: metrics.deviceType,
      status: metrics.status,
    };

    this.deviceConnectionsCounter.add(1, labels);
  }

  updateActiveDevices(delta: number, deviceType?: string) {
    this.activeDevicesGauge.add(delta, {
      service: this.serviceInfo.serviceName,
      version: this.serviceInfo.serviceVersion,
      environment: this.serviceInfo.environment,
      device_type: deviceType || 'unknown',
    });
  }

  // === Custom Metrics ===
  recordCustomCounter(name: string, value: number, labels: MetricLabels = {}) {
    const counter = this.meter.createCounter(`custom_${name}`, {
      description: `Custom counter metric: ${name}`,
    });

    const enrichedLabels = {
      service: this.serviceInfo.serviceName,
      version: this.serviceInfo.serviceVersion,
      environment: this.serviceInfo.environment,
      ...labels,
    };

    counter.add(value, enrichedLabels);
  }

  recordCustomHistogram(
    name: string,
    value: number,
    unit = '',
    labels: MetricLabels = {}
  ) {
    const histogram = this.meter.createHistogram(`custom_${name}`, {
      description: `Custom histogram metric: ${name}`,
      unit,
    });

    const enrichedLabels = {
      service: this.serviceInfo.serviceName,
      version: this.serviceInfo.serviceVersion,
      environment: this.serviceInfo.environment,
      ...labels,
    };

    histogram.record(value, enrichedLabels);
  }

  updateCustomGauge(name: string, delta: number, labels: MetricLabels = {}) {
    const gauge = this.meter.createUpDownCounter(`custom_${name}`, {
      description: `Custom gauge metric: ${name}`,
    });

    const enrichedLabels = {
      service: this.serviceInfo.serviceName,
      version: this.serviceInfo.serviceVersion,
      environment: this.serviceInfo.environment,
      ...labels,
    };

    gauge.add(delta, enrichedLabels);
  }

  // === Convenience Methods ===
  recordSuccess(
    operation: string,
    durationMs?: number,
    additionalLabels: MetricLabels = {}
  ) {
    this.recordCustomCounter('operations_success_total', 1, {
      operation,
      ...additionalLabels,
    });

    if (durationMs !== undefined) {
      this.recordCustomHistogram('operation_duration_ms', durationMs, 'ms', {
        operation,
        success: 'true',
        ...additionalLabels,
      });
    }
  }

  recordFailure(
    operation: string,
    errorType: string,
    durationMs?: number,
    additionalLabels: MetricLabels = {}
  ) {
    this.recordCustomCounter('operations_failure_total', 1, {
      operation,
      error_type: errorType,
      ...additionalLabels,
    });

    if (durationMs !== undefined) {
      this.recordCustomHistogram('operation_duration_ms', durationMs, 'ms', {
        operation,
        success: 'false',
        error_type: errorType,
        ...additionalLabels,
      });
    }
  }
}
