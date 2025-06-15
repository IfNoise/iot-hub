// schemas/devices/device.schema.ts
import { z } from 'zod';
import { DiscreteTimerSchema, AnalogTimerSchema } from './timer.schema';
import {
  DiscreteRegulatorSchema,
  AnalogRegulatorSchema,
} from './regulator.schema';
import { IrrigatorSchema } from './irrigator.schema';
import { SensorSchema } from './sensor.schema';
import {
  DiscreteInputSchema,
  AnalogInputSchema,
  DiscreteOutputSchema,
  AnalogOutputSchema,
} from './io.schema';

/**
 * Схемы объединений компонентов устройства
 */
export const TimerSchema = z.union([DiscreteTimerSchema, AnalogTimerSchema]);
export const RegulatorSchema = z.union([
  DiscreteRegulatorSchema,
  AnalogRegulatorSchema,
]);
export const InputSchema = z.union([DiscreteInputSchema, AnalogInputSchema]);
export const OutputSchema = z.union([DiscreteOutputSchema, AnalogOutputSchema]);

/**
 * Схема внутреннего состояния устройства
 */
export const DeviceInternalStateSchema = z
  .object({
    timers: z.array(TimerSchema).describe('Список таймеров устройства'),
    regulators: z
      .array(RegulatorSchema)
      .describe('Список регуляторов устройства'),
    irrigators: z
      .array(IrrigatorSchema)
      .describe('Список ирригаторов устройства'),
    sensors: z.array(SensorSchema).describe('Список сенсоров устройства'),
    inputs: z.array(InputSchema).describe('Список входов устройства'),
    outputs: z.array(OutputSchema).describe('Список выходов устройства'),
  })
  .strict();

/**
 * Базовая схема устройства
 */
export const DeviceSchema = z
  .object({
    id: z.string().describe('Уникальный ID устройства'),
    model: z.string().default('').describe('Модель устройства'),
    publicKey: z.string().describe('Публичный ключ устройства'),
    ownerId: z.string().uuid().nullable().describe('ID владельца устройства'),
    status: z
      .enum(['unbound', 'bound', 'revoked'])
      .default('unbound')
      .describe('Статус привязки устройства'),
    lastSeenAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время последней активности'),
    firmwareVersion: z.string().optional().describe('Версия прошивки'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время создания'),
  })
  .strict();

/**
 * Схема сертификата устройства
 */
export const CertificateSchema = z
  .object({
    id: z.string().uuid().describe('ID сертификата'),
    clientCert: z.string().describe('Клиентский сертификат'),
    caCert: z.string().describe('Корневой CA сертификат'),
    fingerprint: z.string().describe('Отпечаток сертификата'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время создания'),
  })
  .strict();

/*
 * DTO: Create
 */
export const CreateDeviceSchema = z
  .object({
    id: z.string().describe('Уникальный ID устройства'),
    publicKey: z.string().describe('Публичный ключ устройства (временный, для совместимости)'),
    model: z.string().default('').describe('Модель устройства'),
    firmwareVersion: z
      .string()
      .optional()
      .describe('Версия прошивки устройства'),
  })
  .strict();

export const BindDeviceSchema = z
  .object({
    id: z.string().describe('Уникальный ID устройства'),
    ownerId: z.string().uuid().describe('ID владельца устройства'),
  })
  .strict();
