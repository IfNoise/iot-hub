import { z } from 'zod';
import {
  BaseKafkaCommandSchema,
  BaseKafkaResponseSchema,
  DeviceIdSchema,
  UserIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * DEVICE COMMANDS
 * =============================================
 */

/**
 * Команда: Выполнить RPC-вызов на устройстве
 */
export const DeviceRpcCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.rpc'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    method: z.enum([
      'getDeviceState',
      'getSensors',
      'reboot',
      'updateDiscreteTimer',
      'updateAnalogTimer',
      'updateDiscreteRegulator',
      'updateAnalogRegulator',
      'updateIrrigator',
      'setOutput',
      'getConfiguration',
      'setConfiguration',
    ]),
    params: z.record(z.any()).optional(),
    requestedBy: UserIdSchema,
  }),
});

/**
 * Команда: Обновить конфигурацию устройства
 */
export const DeviceConfigUpdateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.config.update'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    configuration: z.object({
      name: z.string().optional(),
      location: z.string().optional(),
      samplingInterval: z.number().int().min(1000).optional(),
      reportingInterval: z.number().int().min(5000).optional(),
      sensors: z
        .array(
          z.object({
            id: z.string(),
            enabled: z.boolean(),
            name: z.string().optional(),
            threshold: z.number().optional(),
          })
        )
        .optional(),
      outputs: z
        .array(
          z.object({
            id: z.string(),
            enabled: z.boolean(),
            name: z.string().optional(),
            defaultState: z.boolean().optional(),
          })
        )
        .optional(),
    }),
    requestedBy: UserIdSchema,
  }),
});

/**
 * Команда: Привязать устройство к пользователю
 */
export const DeviceBindCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.bind'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    userId: UserIdSchema,
    bindingToken: z.string(),
    deviceName: z.string().optional(),
  }),
});

/**
 * Команда: Отвязать устройство
 */
export const DeviceUnbindCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.unbind'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    requestedBy: UserIdSchema,
    reason: z.string().optional(),
  }),
});

/**
 * Команда: OTA обновление
 */
export const DeviceOtaCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.ota'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    firmwareVersion: z.string(),
    downloadUrl: z.string().url(),
    checksum: z.string(),
    requestedBy: UserIdSchema,
    forced: z.boolean().default(false),
  }),
});

/**
 * =============================================
 * DEVICE COMMAND RESPONSES
 * =============================================
 */

/**
 * Ответ на RPC команду
 */
export const DeviceRpcResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('device.response.rpc'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    method: z.string(),
    result: z.record(z.any()).optional(),
    executionTime: z.number().optional(),
  }),
});

/**
 * Ответ на команду обновления конфигурации
 */
export const DeviceConfigUpdateResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('device.response.config.update'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    appliedConfiguration: z.record(z.any()).optional(),
    failedFields: z.array(z.string()).optional(),
  }),
});

/**
 * Ответ на команду привязки
 */
export const DeviceBindResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('device.response.bind'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    userId: UserIdSchema.optional(),
    boundAt: z.string().datetime().optional(),
  }),
});

/**
 * Ответ на команду OTA
 */
export const DeviceOtaResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('device.response.ota'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    status: z.enum([
      'started',
      'downloading',
      'installing',
      'completed',
      'failed',
    ]),
    progress: z.number().min(0).max(100).optional(),
    currentVersion: z.string().optional(),
    targetVersion: z.string().optional(),
  }),
});

/**
 * =============================================
 * UNION SCHEMAS
 * =============================================
 */

export const DeviceCommandSchemas = z.discriminatedUnion('eventType', [
  DeviceRpcCommandSchema,
  DeviceConfigUpdateCommandSchema,
  DeviceBindCommandSchema,
  DeviceUnbindCommandSchema,
  DeviceOtaCommandSchema,
]);

export const DeviceCommandResponseSchemas = z.discriminatedUnion('eventType', [
  DeviceRpcResponseSchema,
  DeviceConfigUpdateResponseSchema,
  DeviceBindResponseSchema,
  DeviceOtaResponseSchema,
]);

/**
 * =============================================
 * TYPES
 * =============================================
 */

export type DeviceRpcCommand = z.infer<typeof DeviceRpcCommandSchema>;
export type DeviceConfigUpdateCommand = z.infer<
  typeof DeviceConfigUpdateCommandSchema
>;
export type DeviceBindCommand = z.infer<typeof DeviceBindCommandSchema>;
export type DeviceUnbindCommand = z.infer<typeof DeviceUnbindCommandSchema>;
export type DeviceOtaCommand = z.infer<typeof DeviceOtaCommandSchema>;

export type DeviceCommand = z.infer<typeof DeviceCommandSchemas>;

export type DeviceRpcResponse = z.infer<typeof DeviceRpcResponseSchema>;
export type DeviceConfigUpdateResponse = z.infer<
  typeof DeviceConfigUpdateResponseSchema
>;
export type DeviceBindResponse = z.infer<typeof DeviceBindResponseSchema>;
export type DeviceOtaResponse = z.infer<typeof DeviceOtaResponseSchema>;

export type DeviceCommandResponse = z.infer<
  typeof DeviceCommandResponseSchemas
>;
