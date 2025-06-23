import { metrics } from '@opentelemetry/api';

// Создаем meter для кастомных метрик IoT Hub
const meter = metrics.getMeter('iot-hub-backend', '1.0.0');

// === Кастомные метрики для IoT Hub Backend ===

// Счетчик подключенных устройств
export const deviceConnectionsCounter = meter.createCounter('iot_device_connections_total', {
  description: 'Total number of device connections',
});

// Гистограмма времени обработки MQTT сообщений
export const mqttMessageProcessingHistogram = meter.createHistogram('iot_mqtt_message_processing_duration_ms', {
  description: 'Time spent processing MQTT messages in milliseconds',
  unit: 'ms',
});

// Счетчик MQTT сообщений по типу
export const mqttMessagesCounter = meter.createCounter('iot_mqtt_messages_total', {
  description: 'Total number of MQTT messages by type',
});

// Gauge для активных устройств
export const activeDevicesGauge = meter.createUpDownCounter('iot_active_devices', {
  description: 'Number of currently active devices',
});

// Счетчик ошибок по типу
export const errorsCounter = meter.createCounter('iot_errors_total', {
  description: 'Total number of errors by type',
});

// Гистограмма времени ответа API
export const apiResponseTimeHistogram = meter.createHistogram('iot_api_response_time_ms', {
  description: 'API response time in milliseconds',
  unit: 'ms',
});

// Счетчик аутентификации
export const authCounter = meter.createCounter('iot_auth_attempts_total', {
  description: 'Total authentication attempts by result',
});

// Gauge для использования памяти устройствами
export const deviceMemoryUsageGauge = meter.createUpDownCounter('iot_device_memory_usage_bytes', {
  description: 'Memory usage by devices in bytes',
  unit: 'bytes',
});

// === Утилитарные функции для записи метрик ===

export const MetricsService = {
  // Записать подключение устройства
  recordDeviceConnection(deviceId: string, deviceType: string) {
    deviceConnectionsCounter.add(1, {
      device_id: deviceId,
      device_type: deviceType,
    });
  },

  // Записать обработку MQTT сообщения
  recordMqttMessageProcessing(durationMs: number, messageType: string, success: boolean) {
    mqttMessageProcessingHistogram.record(durationMs, {
      message_type: messageType,
      success: success.toString(),
    });
    
    mqttMessagesCounter.add(1, {
      message_type: messageType,
      success: success.toString(),
    });
  },

  // Обновить количество активных устройств
  updateActiveDevices(delta: number, deviceType?: string) {
    activeDevicesGauge.add(delta, {
      device_type: deviceType || 'unknown',
    });
  },

  // Записать ошибку
  recordError(errorType: string, operation: string, deviceId?: string) {
    errorsCounter.add(1, {
      error_type: errorType,
      operation: operation,
      device_id: deviceId || 'unknown',
    });
  },

  // Записать время ответа API
  recordApiResponse(durationMs: number, method: string, endpoint: string, statusCode: number) {
    apiResponseTimeHistogram.record(durationMs, {
      method: method,
      endpoint: endpoint,
      status_code: statusCode.toString(),
    });
  },

  // Записать попытку аутентификации
  recordAuthAttempt(success: boolean, method: string, userId?: string) {
    authCounter.add(1, {
      success: success.toString(),
      method: method,
      user_id: userId || 'anonymous',
    });
  },

  // Обновить использование памяти устройством
  updateDeviceMemoryUsage(bytes: number, deviceId: string) {
    deviceMemoryUsageGauge.add(bytes, {
      device_id: deviceId,
    });
  },
};

// Экспорт для использования в других модулях
export * from '@opentelemetry/api';
