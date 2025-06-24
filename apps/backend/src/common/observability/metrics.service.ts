import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import {
  DeviceMetrics,
  MqttMetrics,
  ApiMetrics,
  AuthMetrics,
  ErrorMetrics,
  MetricLabels,
} from './types';

@Injectable()
export class MetricsService {
  private readonly meter = metrics.getMeter('iot-hub-backend', '1.0.0');

  // === Кастомные метрики для IoT Hub Backend ===

  // Счетчик подключенных устройств
  private readonly deviceConnectionsCounter = this.meter.createCounter('iot_device_connections_total', {
    description: 'Total number of device connections',
  });

  // Гистограмма времени обработки MQTT сообщений
  private readonly mqttMessageProcessingHistogram = this.meter.createHistogram('iot_mqtt_message_processing_duration_ms', {
    description: 'Time spent processing MQTT messages in milliseconds',
    unit: 'ms',
  });

  // Счетчик MQTT сообщений по типу
  private readonly mqttMessagesCounter = this.meter.createCounter('iot_mqtt_messages_total', {
    description: 'Total number of MQTT messages by type',
  });

  // Gauge для активных устройств
  private readonly activeDevicesGauge = this.meter.createUpDownCounter('iot_active_devices', {
    description: 'Number of currently active devices',
  });

  // Счетчик ошибок по типу
  private readonly errorsCounter = this.meter.createCounter('iot_errors_total', {
    description: 'Total number of errors by type',
  });

  // Гистограмма времени ответа API
  private readonly apiResponseTimeHistogram = this.meter.createHistogram('iot_api_response_time_ms', {
    description: 'API response time in milliseconds',
    unit: 'ms',
  });

  // Счетчик аутентификации
  private readonly authCounter = this.meter.createCounter('iot_auth_attempts_total', {
    description: 'Total authentication attempts by result',
  });

  // Gauge для использования памяти устройствами
  private readonly deviceMemoryUsageGauge = this.meter.createUpDownCounter('iot_device_memory_usage_bytes', {
    description: 'Memory usage by devices in bytes',
    unit: 'bytes',
  });

  // === Методы для записи метрик ===

  /**
   * Записать подключение устройства
   */
  recordDeviceConnection(metrics: DeviceMetrics) {
    this.deviceConnectionsCounter.add(1, {
      device_id: metrics.deviceId,
      device_type: metrics.deviceType,
      status: metrics.status,
    });
  }

  /**
   * Записать обработку MQTT сообщения
   */
  recordMqttMessage(metrics: MqttMetrics) {
    this.mqttMessageProcessingHistogram.record(metrics.durationMs, {
      message_type: metrics.messageType,
      topic: metrics.topic,
      success: metrics.success.toString(),
    });
    
    this.mqttMessagesCounter.add(1, {
      message_type: metrics.messageType,
      topic: metrics.topic,
      success: metrics.success.toString(),
    });
  }

  /**
   * Обновить количество активных устройств
   */
  updateActiveDevices(delta: number, deviceType?: string) {
    this.activeDevicesGauge.add(delta, {
      device_type: deviceType || 'unknown',
    });
  }

  /**
   * Записать ошибку
   */
  recordError(metrics: ErrorMetrics) {
    this.errorsCounter.add(1, {
      error_type: metrics.errorType,
      operation: metrics.operation,
      severity: metrics.severity,
      device_id: metrics.deviceId || 'unknown',
      user_id: metrics.userId || 'unknown',
    });
  }

  /**
   * Записать время ответа API
   */
  recordApiResponse(metrics: ApiMetrics) {
    this.apiResponseTimeHistogram.record(metrics.durationMs, {
      method: metrics.method,
      endpoint: metrics.endpoint,
      status_code: metrics.statusCode.toString(),
      user_id: metrics.userId || 'anonymous',
    });
  }

  /**
   * Записать попытку аутентификации
   */
  recordAuthAttempt(metrics: AuthMetrics) {
    this.authCounter.add(1, {
      success: metrics.success.toString(),
      method: metrics.method,
      user_id: metrics.userId || 'anonymous',
      error_type: metrics.errorType || 'none',
    });
  }

  /**
   * Обновить использование памяти устройством
   */
  updateDeviceMemoryUsage(bytes: number, deviceId: string) {
    this.deviceMemoryUsageGauge.add(bytes, {
      device_id: deviceId,
    });
  }

  // === Утилитарные методы ===

  /**
   * Записать кастомную метрику с произвольными лейблами
   */
  recordCustomCounter(name: string, value: number, labels: MetricLabels = {}) {
    const counter = this.meter.createCounter(`iot_custom_${name}`, {
      description: `Custom counter metric: ${name}`,
    });
    counter.add(value, labels);
  }

  /**
   * Записать кастомную гистограмму
   */
  recordCustomHistogram(name: string, value: number, unit = '', labels: MetricLabels = {}) {
    const histogram = this.meter.createHistogram(`iot_custom_${name}`, {
      description: `Custom histogram metric: ${name}`,
      unit,
    });
    histogram.record(value, labels);
  }

  /**
   * Обновить кастомный gauge
   */
  updateCustomGauge(name: string, delta: number, labels: MetricLabels = {}) {
    const gauge = this.meter.createUpDownCounter(`iot_custom_${name}`, {
      description: `Custom gauge metric: ${name}`,
    });
    gauge.add(delta, labels);
  }

  // === Удобные методы для общих операций ===

  /**
   * Записать успешную операцию с устройством
   */
  recordDeviceOperationSuccess(deviceId: string, operation: string, durationMs?: number) {
    this.recordDeviceConnection({
      deviceId,
      deviceType: 'unknown',
      status: 'connected',
    });

    if (durationMs !== undefined) {
      this.recordCustomHistogram('device_operation_duration_ms', durationMs, 'ms', {
        device_id: deviceId,
        operation,
        success: 'true',
      });
    }
  }

  /**
   * Записать ошибку операции с устройством
   */
  recordDeviceOperationError(deviceId: string, operation: string, errorType: string, severity: ErrorMetrics['severity'] = 'medium') {
    this.recordError({
      errorType,
      operation,
      severity,
      deviceId,
    });
  }

  /**
   * Записать MQTT операцию
   */
  recordMqttOperation(topic: string, messageType: string, success: boolean, durationMs: number) {
    this.recordMqttMessage({
      messageType,
      topic,
      success,
      durationMs,
    });
  }

  /**
   * Записать API операцию
   */
  recordApiOperation(method: string, endpoint: string, statusCode: number, durationMs: number, userId?: string) {
    this.recordApiResponse({
      method,
      endpoint,
      statusCode,
      durationMs,
      userId,
    });
  }
}
