import { z } from 'zod';

/**
 * Схема валидации для получения состояния устройства
 * Используется для метода 'getDeviceState'
 * Не требует параметров
 */
export const GetDeviceStateSchema = z.object({});

/**
 * Схема валидации для получения данных сенсоров
 * Используется для метода 'getSensors'
 * Не требует параметров
 */
export const GetSensorsSchema = z.object({});

/**
 * Схема валидации для перезагрузки устройства
 * Используется для метода 'reboot'
 * Не требует параметров
 */
export const RebootSchema = z.object({});

/**
 * Схема для RPC запроса
 */
export const MqttRpcRequestSchema = z.object({
  id: z.string().describe('Уникальный ID запроса'),
  method: z.string().describe('Название метода'),
  params: z.record(z.any()).optional().describe('Параметры метода'),
  timestamp: z.number().describe('Временная метка запроса'),
});

/**
 * Схема для RPC ответа
 */
export const MqttRpcResponseSchema = z.object({
  id: z.string().describe('ID запроса'),
  result: z.any().optional().describe('Результат выполнения метода'),
  error: z
    .object({
      code: z.number().describe('Код ошибки'),
      message: z.string().describe('Сообщение об ошибке'),
      data: z.any().optional().describe('Дополнительные данные об ошибке'),
    })
    .optional()
    .describe('Информация об ошибке'),
  timestamp: z.number().describe('Временная метка ответа'),
});

/**
 * Схема для MQTT топика устройства
 */
export const MqttTopicSchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  category: z
    .enum(['rpc', 'telemetry', 'attributes'])
    .describe('Категория топика'),
  direction: z
    .enum(['request', 'response'])
    .optional()
    .describe('Направление (для RPC)'),
});

/**
 * Схема для телеметрии устройства
 */
export const DeviceTelemetrySchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  timestamp: z.number().describe('Временная метка'),
  sensors: z.record(z.number()).describe('Данные сенсоров'),
  system: z
    .object({
      uptime: z.number().describe('Время работы в секундах'),
      freeMemory: z.number().describe('Свободная память в байтах'),
      cpuUsage: z.number().describe('Загрузка процессора в процентах'),
    })
    .optional()
    .describe('Системная информация'),
});

/**
 * Схема для атрибутов устройства
 */
export const DeviceAttributesSchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  timestamp: z.number().describe('Временная метка'),
  attributes: z.record(z.any()).describe('Атрибуты устройства'),
});

/**
 * Схема для статуса подключения устройства
 */
export const DeviceConnectionStatusSchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  status: z.enum(['connected', 'disconnected']).describe('Статус подключения'),
  timestamp: z.number().describe('Временная метка'),
  clientId: z.string().optional().describe('ID MQTT клиента'),
});

/**
 * Объект со всеми схемами RPC методов
 * Ключи соответствуют названиям методов, значения - Zod схемы для валидации
 */
export const rpcSchemas = {
  getDeviceState: GetDeviceStateSchema,
  getSensors: GetSensorsSchema,
  reboot: RebootSchema,
} as const;

/**
 * Типы для всех схем
 */
export type MqttRpcRequest = z.infer<typeof MqttRpcRequestSchema>;
export type MqttRpcResponse = z.infer<typeof MqttRpcResponseSchema>;
export type MqttTopic = z.infer<typeof MqttTopicSchema>;
export type DeviceTelemetry = z.infer<typeof DeviceTelemetrySchema>;
export type DeviceAttributes = z.infer<typeof DeviceAttributesSchema>;
export type DeviceConnectionStatus = z.infer<
  typeof DeviceConnectionStatusSchema
>;

/**
 * Типы RPC методов
 */
export type RpcMethod = keyof typeof rpcSchemas;
export type GetDeviceStateParams = z.infer<typeof GetDeviceStateSchema>;
export type GetSensorsParams = z.infer<typeof GetSensorsSchema>;
export type RebootParams = z.infer<typeof RebootSchema>;
