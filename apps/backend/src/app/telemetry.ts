import { metrics, trace } from '@opentelemetry/api';

// Получаем meter для создания кастомных метрик
const meter = metrics.getMeter('iot-hub-backend', '1.0.0');

// Создаем кастомные метрики для IoT Hub
export const customMetrics = {
  // Счетчик подключенных устройств
  devicesConnected: meter.createCounter('iot_devices_connected_total', {
    description: 'Total number of devices connected to the IoT hub',
  }),

  // Счетчик отключенных устройств
  devicesDisconnected: meter.createCounter('iot_devices_disconnected_total', {
    description: 'Total number of devices disconnected from the IoT hub',
  }),

  // Гистограмма времени обработки MQTT сообщений
  mqttMessageProcessingTime: meter.createHistogram('iot_mqtt_message_processing_duration_ms', {
    description: 'Time taken to process MQTT messages in milliseconds',
    unit: 'ms',
  }),

  // Счетчик MQTT сообщений по типам
  mqttMessagesReceived: meter.createCounter('iot_mqtt_messages_received_total', {
    description: 'Total number of MQTT messages received by type',
  }),

  // Счетчик ошибок API
  apiErrors: meter.createCounter('iot_api_errors_total', {
    description: 'Total number of API errors by endpoint and error type',
  }),

  // Гистограмма времени ответа API
  apiResponseTime: meter.createHistogram('iot_api_response_duration_ms', {
    description: 'API response time in milliseconds',
    unit: 'ms',
  }),

  // Gauge для активных WebSocket соединений
  activeWebsockets: meter.createUpDownCounter('iot_websocket_connections_active', {
    description: 'Number of active WebSocket connections',
  }),

  // Счетчик операций с базой данных
  databaseOperations: meter.createCounter('iot_database_operations_total', {
    description: 'Total number of database operations by type and table',
  }),

  // Гистограмма времени выполнения запросов к БД
  databaseQueryTime: meter.createHistogram('iot_database_query_duration_ms', {
    description: 'Database query execution time in milliseconds',
    unit: 'ms',
  }),
};

// Утилиты для работы с трейсами
export const traceUtils = {
  // Создание нового спана с общими атрибутами
  createSpan(name: string, attributes: Record<string, string | number | boolean> = {}) {
    const tracer = trace.getTracer('iot-hub-backend', '1.0.0');
    return tracer.startSpan(name, {
      attributes: {
        'service.name': 'iot-hub-backend',
        ...attributes,
      },
    });
  },

  // Добавление атрибутов к текущему спану
  addAttributes(attributes: Record<string, string | number | boolean>) {
    const span = trace.getActiveSpan();
    if (span) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  },

  // Установка статуса ошибки для текущего спана
  setError(error: Error) {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
    }
  },
};

// Декоратор для автоматического создания спанов и метрик
export function withTelemetry(operationName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const span = traceUtils.createSpan(`${operationName}.${propertyKey}`);
      
      try {
        const result = await originalMethod.apply(this, args);
        
        // Записываем метрику успешного выполнения
        customMetrics.apiResponseTime.record(Date.now() - startTime, {
          operation: operationName,
          method: propertyKey,
          status: 'success',
        });
        
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        // Записываем метрику ошибки
        customMetrics.apiErrors.add(1, {
          operation: operationName,
          method: propertyKey,
          error_type: error instanceof Error ? error.constructor.name : 'unknown',
        });
        
        traceUtils.setError(error as Error);
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

// Функции-помощники для конкретных случаев использования
export const telemetryHelpers = {
  // Фиксация подключения устройства
  recordDeviceConnection(deviceId: string, deviceType?: string) {
    customMetrics.devicesConnected.add(1, {
      device_id: deviceId,
      device_type: deviceType || 'unknown',
    });
  },

  // Фиксация отключения устройства
  recordDeviceDisconnection(deviceId: string, reason?: string) {
    customMetrics.devicesDisconnected.add(1, {
      device_id: deviceId,
      disconnect_reason: reason || 'unknown',
    });
  },

  // Фиксация MQTT сообщения
  recordMqttMessage(topic: string, messageSize: number, processingTimeMs: number) {
    customMetrics.mqttMessagesReceived.add(1, {
      topic: topic,
      message_size_kb: Math.round(messageSize / 1024),
    });
    
    customMetrics.mqttMessageProcessingTime.record(processingTimeMs, {
      topic: topic,
    });
  },

  // Фиксация операции с БД
  recordDatabaseOperation(table: string, operation: string, durationMs: number) {
    customMetrics.databaseOperations.add(1, {
      table: table,
      operation: operation,
    });
    
    customMetrics.databaseQueryTime.record(durationMs, {
      table: table,
      operation: operation,
    });
  },

  // Обновление счетчика WebSocket соединений
  updateWebsocketCount(delta: number) {
    customMetrics.activeWebsockets.add(delta);
  },
};
