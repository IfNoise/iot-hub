import { z } from 'zod';

/**
 * ==============================================
 * QR-КОДЫ ДЛЯ УСТРОЙСТВ
 * ==============================================
 *
 * Три подхода к QR-кодам с разным уровнем безопасности и размера:
 * 1. Минимальный: deviceId + fingerprint (самый компактный)
 * 2. С токеном: deviceId + bindingToken + expiration (рекомендуемый)
 * 3. С хешем: deviceId + fingerprint + publicKeyHash (компромисс)
 */

/**
 * Схема минимального QR-кода (Вариант 1)
 * Только необходимая информация для идентификации и проверки
 *
 * Пример: {"deviceId":"ESP32-12345","fingerprint":"AA:BB:CC:DD:EE:FF","v":1}
 * Размер: ~70-80 символов
 */
export const MinimalDeviceQRSchema = z
  .object({
    deviceId: z.string().describe('Уникальный идентификатор устройства'),
    fingerprint: z.string().describe('Отпечаток сертификата устройства'),
    v: z.number().default(1).describe('Версия схемы QR-кода'),
  })
  .strict();

/**
 * Схема QR-кода с токеном привязки (Вариант 2 - Рекомендуемый)
 * Использует бессрочный токен для безопасности
 *
 * Пример: {"deviceId":"ESP32-12345","bindingToken":"abc123def456","v":1}
 * Размер: ~80-90 символов
 */
export const TokenBasedDeviceQRSchema = z
  .object({
    deviceId: z.string().describe('Уникальный идентификатор устройства'),
    bindingToken: z
      .string()
      .min(16)
      .max(64)
      .describe('Бессрочный токен привязки (16-64 символа)'),
    v: z.number().default(1).describe('Версия схемы QR-кода'),
  })
  .strict();

/**
 * Схема QR-кода с хешем ключа (Вариант 3)
 * Компромисс между безопасностью и размером
 *
 * Пример: {"deviceId":"ESP32-12345","fingerprint":"AA:BB:CC:DD","keyHash":"sha256-abc123","v":1}
 * Размер: ~110-120 символов
 */
export const HashBasedDeviceQRSchema = z
  .object({
    deviceId: z.string().describe('Уникальный идентификатор устройства'),
    fingerprint: z.string().describe('Отпечаток сертификата устройства'),
    keyHash: z
      .string()
      .startsWith('sha256-')
      .describe('SHA256 хеш публичного ключа (первые 16 символов)'),
    v: z.number().default(1).describe('Версия схемы QR-кода'),
  })
  .strict();

/**
 * Объединенная схема QR-кода устройства
 * Поддерживает все три варианта для гибкости
 */
export const DeviceQRDataSchema = z.union([
  MinimalDeviceQRSchema,
  TokenBasedDeviceQRSchema,
  HashBasedDeviceQRSchema,
]);

/**
 * ==============================================
 * СХЕМЫ ПРИВЯЗКИ УСТРОЙСТВА
 * ==============================================
 */

/**
 * Схема для привязки через минимальный QR-код
 */
export const BindDeviceMinimalSchema = z
  .object({
    deviceId: z.string().describe('ID устройства из QR-кода'),
    fingerprint: z.string().describe('Отпечаток сертификата из QR-кода'),
  })
  .strict();

/**
 * Схема для привязки через токен (рекомендуемая)
 */
export const BindDeviceTokenSchema = z
  .object({
    deviceId: z.string().describe('ID устройства из QR-кода'),
    bindingToken: z.string().describe('Токен привязки из QR-кода'),
  })
  .strict();

/**
 * Схема для привязки через хеш ключа
 */
export const BindDeviceHashSchema = z
  .object({
    deviceId: z.string().describe('ID устройства из QR-кода'),
    fingerprint: z.string().describe('Отпечаток сертификата из QR-кода'),
    keyHash: z.string().describe('Хеш публичного ключа из QR-кода'),
  })
  .strict();

/**
 * Универсальная схема привязки устройства
 * userId получается из контекста аутентификации (middleware)
 */
export const BindDeviceRequestSchema = z
  .object({
    qrData: DeviceQRDataSchema.describe('Данные из сканированного QR-кода'),
  })
  .strict();

/**
 * ==============================================
 * ПРОИЗВОДСТВЕННЫЙ ПРОЦЕСС
 * ==============================================
 */

/**
 * Схема для генерации устройства в производстве
 */
export const GenerateDeviceQRSchema = z
  .object({
    deviceId: z.string().describe('ID устройства'),
    model: z.string().describe('Модель устройства'),
    firmwareVersion: z.string().describe('Версия прошивки'),
    publicKeyPem: z.string().describe('Публичный ключ в формате PEM'),
    qrType: z
      .enum(['minimal', 'token', 'hash'])
      .default('token')
      .describe('Тип QR-кода для генерации'),
  })
  .strict();

/**
 * Ответ генерации QR-кода устройства
 */
export const GenerateDeviceQRResponseSchema = z
  .object({
    deviceId: z.string().describe('ID устройства'),
    qrData: DeviceQRDataSchema.describe('Данные для QR-кода'),
    qrCodeBase64: z.string().optional().describe('QR-код в формате Base64'),
    qrCodeSvg: z.string().optional().describe('QR-код в формате SVG'),
    bindingToken: z
      .string()
      .optional()
      .describe('Бессрочный токен привязки (если используется)'),
    estimatedQRSize: z.number().describe('Примерный размер QR-кода в символах'),
  })
  .strict();

/**
 * ==============================================
 * ВАЛИДАЦИЯ И БЕЗОПАСНОСТЬ
 * ==============================================
 */

/**
 * Схема для валидации токена привязки
 */
export const ValidateBindingTokenSchema = z
  .object({
    deviceId: z.string().describe('ID устройства'),
    bindingToken: z.string().describe('Токен для проверки'),
  })
  .strict();

/**
 * Схема результата валидации
 */
export const ValidationResultSchema = z
  .object({
    isValid: z.boolean().describe('Валиден ли токен/данные'),
    reason: z.string().optional().describe('Причина невалидности'),
    deviceExists: z.boolean().describe('Существует ли устройство'),
    canBind: z.boolean().describe('Можно ли привязать устройство'),
  })
  .strict();

/**
 * ==============================================
 * TYPESCRIPT ТИПЫ
 * ==============================================
 */

// QR-коды
export type MinimalDeviceQR = z.infer<typeof MinimalDeviceQRSchema>;
export type TokenBasedDeviceQR = z.infer<typeof TokenBasedDeviceQRSchema>;
export type HashBasedDeviceQR = z.infer<typeof HashBasedDeviceQRSchema>;
export type DeviceQRData = z.infer<typeof DeviceQRDataSchema>;

// Привязка устройства
export type BindDeviceMinimal = z.infer<typeof BindDeviceMinimalSchema>;
export type BindDeviceToken = z.infer<typeof BindDeviceTokenSchema>;
export type BindDeviceHash = z.infer<typeof BindDeviceHashSchema>;
export type BindDeviceRequest = z.infer<typeof BindDeviceRequestSchema>;

// Производство
export type GenerateDeviceQR = z.infer<typeof GenerateDeviceQRSchema>;
export type GenerateDeviceQRResponse = z.infer<
  typeof GenerateDeviceQRResponseSchema
>;

// Валидация
export type ValidateBindingToken = z.infer<typeof ValidateBindingTokenSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
