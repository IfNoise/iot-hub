import { randomUUID } from 'crypto';
import { MqttRpcRequest, RpcRequest } from '../types/index.js';
import { MQTT_TOPICS, RPC_ERROR_CODES } from '../constants/index.js';

/**
 * Генерирует топик для отправки RPC запросов к устройству
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @returns Строка топика в формате users/{userId}/devices/{deviceId}/rpc/request
 *
 * @example
 * ```typescript
 * const topic = getRequestTopic('user123', 'device456');
 * // Результат: 'users/user123/devices/device456/rpc/request'
 * ```
 */
export const getRequestTopic = (userId: string, deviceId: string): string =>
  `${MQTT_TOPICS.USERS_PREFIX}/${userId}/${MQTT_TOPICS.DEVICES_PREFIX}/${deviceId}/${MQTT_TOPICS.RPC_REQUEST}`;

/**
 * Генерирует топик для получения RPC ответов от устройства
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @returns Строка топика в формате users/{userId}/devices/{deviceId}/rpc/response
 *
 * @example
 * ```typescript
 * const topic = getResponseTopic('user123', 'device456');
 * // Результат: 'users/user123/devices/device456/rpc/response'
 * ```
 */
export const getResponseTopic = (userId: string, deviceId: string): string =>
  `${MQTT_TOPICS.USERS_PREFIX}/${userId}/${MQTT_TOPICS.DEVICES_PREFIX}/${deviceId}/${MQTT_TOPICS.RPC_RESPONSE}`;

/**
 * Генерирует топик для телеметрии устройства
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @returns Строка топика для телеметрии
 */
export const getTelemetryTopic = (userId: string, deviceId: string): string =>
  `${MQTT_TOPICS.USERS_PREFIX}/${userId}/${MQTT_TOPICS.DEVICES_PREFIX}/${deviceId}/${MQTT_TOPICS.TELEMETRY}`;

/**
 * Генерирует топик для атрибутов устройства
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @returns Строка топика для атрибутов
 */
export const getAttributesTopic = (userId: string, deviceId: string): string =>
  `${MQTT_TOPICS.USERS_PREFIX}/${userId}/${MQTT_TOPICS.DEVICES_PREFIX}/${deviceId}/${MQTT_TOPICS.ATTRIBUTES}`;

/**
 * Создает RPC запрос для MQTT с топиком и сообщением
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @param method - Название RPC метода
 * @param params - Параметры метода
 * @returns Объект с топиком и RPC сообщением
 *
 * @example
 * ```typescript
 * const request = createRpcRequest(
 *   'user123',
 *   'device456',
 *   'getDeviceState',
 *   {}
 * );
 * ```
 */
export function createRpcRequest(
  userId: string,
  deviceId: string,
  method: string,
  params?: Record<string, unknown>
): MqttRpcRequest {
  return {
    topic: getRequestTopic(userId, deviceId),
    message: {
      id: randomUUID(),
      deviceId,
      method,
      params,
    },
  };
}

/**
 * Создает RPC запрос для WebSocket (без топика)
 * @param deviceId - Идентификатор устройства
 * @param method - Название RPC метода
 * @param params - Параметры метода
 * @returns RPC запрос готовый для отправки через WebSocket
 *
 * @example
 * ```typescript
 * const request = createWsRpcRequest(
 *   'device456',
 *   'getDeviceState',
 *   {}
 * );
 * ```
 */
export function createWsRpcRequest(
  deviceId: string,
  method: string,
  params?: Record<string, unknown>
): RpcRequest {
  return {
    id: randomUUID(),
    deviceId,
    method,
    params,
  };
}

/**
 * Создает ответ об ошибке RPC
 * @param id - ID исходного запроса
 * @param code - Код ошибки
 * @param message - Сообщение об ошибке
 * @returns Объект ответа с ошибкой
 */
export function createRpcError(id: string, code: number, message: string) {
  return {
    id,
    error: {
      code,
      message,
    },
  };
}

/**
 * Создает успешный ответ RPC
 * @param id - ID исходного запроса
 * @param result - Результат выполнения
 * @returns Объект успешного ответа
 */
export function createRpcSuccess(id: string, result: Record<string, unknown>) {
  return {
    id,
    result,
  };
}

/**
 * Проверяет валидность топика MQTT
 * @param topic - Топик для проверки
 * @returns true если топик валиден
 */
export function isValidMqttTopic(topic: string): boolean {
  return /^[a-zA-Z0-9_\-/]+$/.test(topic) && topic.length <= 256;
}

/**
 * Извлекает компоненты из топика MQTT
 * @param topic - Топик для разбора
 * @returns Объект с компонентами топика или null если топик невалиден
 */
export function parseTopicComponents(topic: string): {
  userId: string;
  deviceId: string;
  type: 'request' | 'response' | 'telemetry' | 'attributes';
} | null {
  const parts = topic.split('/');

  if (parts.length < 5 || parts[0] !== 'users' || parts[2] !== 'devices') {
    return null;
  }

  const userId = parts[1];
  const deviceId = parts[3];

  let type: 'request' | 'response' | 'telemetry' | 'attributes';

  if (parts[4] === 'rpc' && parts[5] === 'request') {
    type = 'request';
  } else if (parts[4] === 'rpc' && parts[5] === 'response') {
    type = 'response';
  } else if (parts[4] === 'telemetry') {
    type = 'telemetry';
  } else if (parts[4] === 'attributes') {
    type = 'attributes';
  } else {
    return null;
  }

  return { userId, deviceId, type };
}

/**
 * Стандартные ошибки RPC
 */
export const RpcErrors = {
  unknownMethod: (id: string, method: string) =>
    createRpcError(
      id,
      RPC_ERROR_CODES.UNKNOWN_METHOD,
      `Unknown method: ${method}`
    ),

  invalidParams: (id: string, message?: string) =>
    createRpcError(
      id,
      RPC_ERROR_CODES.INVALID_PARAMS,
      message || 'Invalid parameters'
    ),

  internalError: (id: string, message?: string) =>
    createRpcError(
      id,
      RPC_ERROR_CODES.INTERNAL_ERROR,
      message || 'Internal error'
    ),

  timeout: (id: string) =>
    createRpcError(id, RPC_ERROR_CODES.TIMEOUT, 'Request timeout'),

  deviceUnavailable: (id: string) =>
    createRpcError(
      id,
      RPC_ERROR_CODES.DEVICE_UNAVAILABLE,
      'Device unavailable'
    ),

  executionError: (id: string, message: string) =>
    createRpcError(id, RPC_ERROR_CODES.EXECUTION_ERROR, message),
};
