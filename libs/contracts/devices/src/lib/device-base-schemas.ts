import { z } from 'zod';

/**
 * Базовая схема устройства
 */
export const DeviceBaseSchema = z.object({
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
});

/**
 * Схема сертификата устройства
 */
export const CertificateBaseSchema = z.object({
  id: z.string().uuid().describe('ID сертификата'),
  clientCert: z.string().describe('Клиентский сертификат'),
  caCert: z.string().describe('Корневой CA сертификат'),
  fingerprint: z.string().describe('Отпечаток сертификата'),
  createdAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Время создания'),
});

/**
 * DTO: Create Device
 */
export const CreateDeviceBaseSchema = z.object({
  id: z.string().describe('Уникальный ID устройства'),
  publicKey: z
    .string()
    .describe('Публичный ключ устройства (временный, для совместимости)'),
  model: z.string().default('').describe('Модель устройства'),
  firmwareVersion: z.string().optional().describe('Версия прошивки устройства'),
});

/**
 * DTO: Bind Device
 */
export const BindDeviceBaseSchema = z.object({
  id: z.string().describe('Уникальный ID устройства'),
  ownerId: z.string().uuid().describe('ID владельца устройства'),
});

/**
 * Типы TypeScript
 */
export type DeviceBase = z.infer<typeof DeviceBaseSchema>;
export type CertificateBase = z.infer<typeof CertificateBaseSchema>;
export type CreateDeviceBase = z.infer<typeof CreateDeviceBaseSchema>;
export type BindDeviceBase = z.infer<typeof BindDeviceBaseSchema>;
