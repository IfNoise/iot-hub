import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { rpcSchemas } from 'iot-core/schemas';

/**
 * Базовая схема для команды устройству
 */
const BaseDeviceCommandSchema = z.object({
  /** Идентификатор пользователя (владельца устройства) */
  userId: z
    .string()
    .min(1, 'ID пользователя обязателен')
    .max(255, 'ID пользователя слишком длинный'),

  /** Идентификатор устройства */
  deviceId: z
    .string()
    .min(1, 'ID устройства обязателен')
    .max(255, 'ID устройства слишком длинный'),

  /** Таймаут ожидания ответа в миллисекундах */
  timeout: z
    .number()
    .int()
    .min(1000, 'Таймаут должен быть не менее 1000 мс')
    .max(30000, 'Таймаут не должен превышать 30000 мс')
    .optional()
    .default(5000),
});

/**
 * Схема для команды получения состояния устройства
 */
const GetDeviceStateCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('getDeviceState'),
  params: rpcSchemas.getDeviceState.optional(),
});

/**
 * Схема для команды получения данных сенсоров
 */
const GetSensorsCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('getSensors'),
  params: rpcSchemas.getSensors.optional(),
});

/**
 * Схема для команды перезагрузки устройства
 */
const RebootCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('reboot'),
  params: rpcSchemas.reboot.optional(),
});

/**
 * Схема для команды обновления дискретного таймера
 */
const UpdateDiscreteTimerCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('updateDiscreteTimer'),
  params: rpcSchemas.updateDiscreteTimer,
});

/**
 * Схема для команды обновления аналогового таймера
 */
const UpdateAnalogTimerCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('updateAnalogTimer'),
  params: rpcSchemas.updateAnalogTimer,
});

/**
 * Схема для команды обновления дискретного регулятора
 */
const UpdateDiscreteRegulatorCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('updateDiscreteRegulator'),
  params: rpcSchemas.updateDiscreteRegulator,
});

/**
 * Схема для команды обновления аналогового регулятора
 */
const UpdateAnalogRegulatorCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('updateAnalogRegulator'),
  params: rpcSchemas.updateAnalogRegulator,
});

/**
 * Схема для команды обновления ирригатора
 */
const UpdateIrrigatorCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.literal('updateIrrigator'),
  params: rpcSchemas.updateIrrigator,
});

/**
 * Объединенная схема для всех типов команд
 */
export const DeviceCommandSchema = z.discriminatedUnion('method', [
  GetDeviceStateCommandSchema,
  GetSensorsCommandSchema,
  RebootCommandSchema,
  UpdateDiscreteTimerCommandSchema,
  UpdateAnalogTimerCommandSchema,
  UpdateDiscreteRegulatorCommandSchema,
  UpdateAnalogRegulatorCommandSchema,
  UpdateIrrigatorCommandSchema,
]);

/**
 * Схема для команды без ожидания ответа
 */
export const DeviceCommandNoResponseSchema = z.discriminatedUnion('method', [
  GetDeviceStateCommandSchema.omit({ timeout: true }),
  GetSensorsCommandSchema.omit({ timeout: true }),
  RebootCommandSchema.omit({ timeout: true }),
  UpdateDiscreteTimerCommandSchema.omit({ timeout: true }),
  UpdateAnalogTimerCommandSchema.omit({ timeout: true }),
  UpdateDiscreteRegulatorCommandSchema.omit({ timeout: true }),
  UpdateAnalogRegulatorCommandSchema.omit({ timeout: true }),
  UpdateIrrigatorCommandSchema.omit({ timeout: true }),
]);

/**
 * Схема для ответа на команду устройства
 */
export const DeviceCommandResponseSchema = z.object({
  /** Уникальный идентификатор запроса */
  id: z.string(),

  /** Результат выполнения команды (при успехе) */
  result: z.any().optional(),

  /** Информация об ошибке (при неудаче) */
  error: z
    .object({
      /** Код ошибки */
      code: z.number(),
      /** Описание ошибки */
      message: z.string(),
    })
    .optional(),

  /** Дополнительные метаданные */
  metadata: z
    .object({
      /** Время выполнения команды в миллисекундах */
      executionTime: z.number().optional(),
      /** Метка времени отправки */
      sentAt: z.string().datetime().optional(),
      /** Метка времени получения ответа */
      receivedAt: z.string().datetime().optional(),
    })
    .optional(),
});

// Создаем базовые DTO классы используя nestjs-zod
export class BaseDeviceCommandDto extends createZodDto(
  BaseDeviceCommandSchema
) {}

// Экспортируем типы
export type DeviceCommand = z.infer<typeof DeviceCommandSchema>;
export type DeviceCommandNoResponse = z.infer<
  typeof DeviceCommandNoResponseSchema
>;
export type DeviceCommandResponse = z.infer<typeof DeviceCommandResponseSchema>;

// Для простоты использования создаем общие DTO классы без дискриминации
export class DeviceCommandDto {
  userId!: string;
  deviceId!: string;
  method!: string;
  params?: Record<string, unknown>;
  timeout?: number;
}

export class DeviceCommandNoResponseDto {
  userId!: string;
  deviceId!: string;
  method!: string;
  params?: Record<string, unknown>;
}

export class DeviceCommandResponseDto {
  id!: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
  metadata?: {
    executionTime?: number;
    sentAt?: string;
    receivedAt?: string;
  };
}
