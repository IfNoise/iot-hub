/**
 * Миграционные адаптеры между REST/MQTT контрактами и Kafka событиями
 *
 * Этот модуль помогает постепенно мигрировать от REST API к event-driven архитектуре
 * с сохранением обратной совместимости
 */

import { z } from 'zod';
import type {
  DeviceRpcCommand,
  DeviceBoundEvent,
  DeviceTelemetryReceivedEvent,
} from '../index.js';

/**
 * =============================================
 * REST → KAFKA ADAPTERS
 * =============================================
 */

/**
 * Адаптер: REST запрос привязки устройства → Kafka команда
 */
export function adaptRestBindDeviceToKafka(
  restRequest: {
    deviceId: string;
    token: string;
    deviceName?: string;
  },
  userId: string,
  correlationId: string
): DeviceRpcCommand {
  return {
    eventType: 'device.command.rpc',
    correlationId,
    timestamp: new Date().toISOString(),
    source: {
      type: 'backend',
      id: 'rest-api-gateway',
    },
    __version: 'v1',
    timeout: 30000,
    responseRequired: true,
    payload: {
      deviceId: restRequest.deviceId,
      method: 'getConfiguration', // Bind будет handled отдельно
      params: {
        token: restRequest.token,
        deviceName: restRequest.deviceName,
      },
      requestedBy: userId,
    },
  };
}

/**
 * Адаптер: REST ответ привязки устройства ← Kafka событие
 */
export function adaptKafkaDeviceBoundToRest(kafkaEvent: DeviceBoundEvent): {
  message: string;
  device: {
    deviceId: string;
    userId: string;
    boundAt: string;
    deviceName?: string;
  };
} {
  return {
    message: 'Device successfully bound to user',
    device: {
      deviceId: kafkaEvent.payload.deviceId,
      userId: kafkaEvent.payload.userId,
      boundAt: kafkaEvent.payload.boundAt,
      deviceName: kafkaEvent.payload.deviceName,
    },
  };
}

/**
 * =============================================
 * MQTT → KAFKA ADAPTERS
 * =============================================
 */

/**
 * Адаптер: MQTT команда → Kafka команда
 */
export function adaptMqttCommandToKafka(
  mqttMessage: {
    deviceId: string;
    method: string;
    params?: Record<string, unknown>;
  },
  userId: string,
  correlationId: string
): DeviceRpcCommand {
  return {
    eventType: 'device.command.rpc',
    correlationId,
    timestamp: new Date().toISOString(),
    source: {
      type: 'backend',
      id: 'mqtt-gateway',
    },
    __version: 'v1',
    timeout: 30000,
    responseRequired: true,
    payload: {
      deviceId: mqttMessage.deviceId,
      method: mqttMessage.method as 'getDeviceState' | 'getSensors' | 'reboot',
      params: mqttMessage.params,
      requestedBy: userId,
    },
  };
}

/**
 * Адаптер: MQTT телеметрия → Kafka событие
 */
export function adaptMqttTelemetryToKafka(mqttMessage: {
  deviceId: string;
  topic: string;
  payload: Record<string, unknown>;
  receivedAt?: string;
}): DeviceTelemetryReceivedEvent {
  return {
    eventType: 'device.telemetry.received',
    correlationId: crypto.randomUUID(),
    timestamp: mqttMessage.receivedAt || new Date().toISOString(),
    source: {
      type: 'device',
      id: mqttMessage.deviceId,
    },
    __version: 'v1',
    payload: {
      deviceId: mqttMessage.deviceId,
      receivedAt: mqttMessage.receivedAt || new Date().toISOString(),
      telemetryType: 'sensors', // Определить по топику или payload
      data: {
        temperature: mqttMessage.payload.temperature as number,
        humidity: mqttMessage.payload.humidity as number,
        pressure: mqttMessage.payload.pressure as number,
        analogInputs: Array.isArray(mqttMessage.payload.analogInputs)
          ? (mqttMessage.payload.analogInputs as Array<{
              id: string;
              value: number;
              unit?: string;
            }>)
          : undefined,
        discreteInputs: Array.isArray(mqttMessage.payload.discreteInputs)
          ? (mqttMessage.payload.discreteInputs as Array<{
              id: string;
              state: boolean;
            }>)
          : undefined,
        batteryLevel: mqttMessage.payload.batteryLevel as number,
        custom: mqttMessage.payload.custom as Record<string, unknown>,
      },
      metadata: {
        protocol: 'mqtt',
        topic: mqttMessage.topic,
        qos: 1,
        retain: false,
      },
    },
  };
}

/**
 * =============================================
 * LEGACY SCHEMA VALIDATION
 * =============================================
 */

/**
 * Схема для валидации legacy MQTT команд
 */
export const LegacyMqttCommandSchema = z.object({
  deviceId: z.string(),
  method: z.enum([
    'getDeviceState',
    'getSensors',
    'reboot',
    'updateDiscreteTimer',
    'updateAnalogTimer',
    'updateDiscreteRegulator',
    'updateAnalogRegulator',
    'updateIrrigator',
  ]),
  params: z.record(z.any()).optional(),
  timeout: z.number().optional(),
});

/**
 * Схема для валидации legacy REST запросов
 */
export const LegacyRestBindDeviceSchema = z.object({
  deviceId: z.string(),
  token: z.string(),
  deviceName: z.string().optional(),
});

/**
 * =============================================
 * COMPATIBILITY HELPERS
 * =============================================
 */

/**
 * Проверяет, можно ли мигрировать legacy MQTT команду в Kafka
 */
export function canMigrateMqttCommand(command: unknown): boolean {
  try {
    LegacyMqttCommandSchema.parse(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверяет, можно ли мигрировать legacy REST запрос в Kafka
 */
export function canMigrateRestRequest(request: unknown): boolean {
  try {
    LegacyRestBindDeviceSchema.parse(request);
    return true;
  } catch {
    return false;
  }
}

/**
 * Генерирует correlation ID для запросов
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Создает source для событий
 */
export function createEventSource(
  type: 'device' | 'backend' | 'user' | 'system',
  id: string,
  version?: string
) {
  return {
    type,
    id,
    version,
  };
}
