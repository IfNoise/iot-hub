import { rpcSchemas } from '../schemas/rpc-methods.schemas';
import { randomUUID } from 'crypto';
import { MqttRpcRequest, RpcRequest } from '../types/rpc.types';

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
  `users/${userId}/devices/${deviceId}/rpc/request`;

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
  `users/${userId}/devices/${deviceId}/rpc/response`;

/**
 * Валидирует RPC запрос против известных схем методов
 * @param method - Название RPC метода
 * @param params - Параметры для валидации
 * @throws Error если метод неизвестен или параметры не прошли валидацию
 *
 * @example
 * ```typescript
 * try {
 *   validateRpc('turnOnLed', { on: true });
 *   console.log('Валидация прошла успешно');
 * } catch (error) {
 *   console.error('Ошибка валидации:', error.message);
 * }
 * ```
 */
export function validateRpc(method: string, params?: any): void {
  // Проверяем, существует ли метод в схеме
  if (method in rpcSchemas) {
    const schema = rpcSchemas[method as keyof typeof rpcSchemas];
    schema.parse(params);
  } else {
    throw new Error(`Unknown RPC method: ${method}`);
  }
}

/**
 * Создает валидированный RPC запрос для MQTT с топиком и сообщением
 * @param userId - Идентификатор пользователя
 * @param deviceId - Идентификатор устройства
 * @param method - Название RPC метода
 * @param params - Параметры метода
 * @returns Объект с топиком и RPC сообщением
 * @throws Error если валидация не прошла
 *
 * @example
 * ```typescript
 * const request = createValidatedRpcRequest(
 *   'user123',
 *   'device456',
 *   'turnOnLed',
 *   { on: true }
 * );
 *
 * // Результат:
 * // {
 * //   topic: 'users/user123/devices/device456/rpc/request',
 * //   message: {
 * //     id: 'generated-uuid',
 * //     deviceId: 'device456',
 * //     method: 'turnOnLed',
 * //     params: { on: true }
 * //   }
 * // }
 * ```
 */
export function createValidatedRpcRequest(
  userId: string,
  deviceId: string,
  method: string,
  params?: any
): MqttRpcRequest {
  validateRpc(method, params);

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
 * Создает валидированный RPC запрос для WebSocket (без топика)
 * @param deviceId - Идентификатор устройства
 * @param method - Название RPC метода
 * @param params - Параметры метода
 * @returns RPC запрос готовый для отправки через WebSocket
 * @throws Error если валидация не прошла
 *
 * @example
 * ```typescript
 * const request = createValidatedWsRpcRequest(
 *   'device456',
 *   'getDeviceState',
 *   {}
 * );
 *
 * // Результат:
 * // {
 * //   id: 'generated-uuid',
 * //   deviceId: 'device456',
 * //   method: 'getDeviceState',
 * //   params: {}
 * // }
 * ```
 */
export function createValidatedWsRpcRequest(
  deviceId: string,
  method: string,
  params?: any
): RpcRequest {
  validateRpc(method, params);

  return {
    id: randomUUID(),
    deviceId,
    method,
    params,
  };
}
