import { z } from 'zod';

/**
 * Схема для CSR (Certificate Signing Request)
 */
export const CsrSchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  csr: z.string().describe('Certificate Signing Request в формате PEM'),
  publicKey: z.string().describe('Публичный ключ устройства'),
});

/**
 * Схема для сертификата устройства
 */
export const DeviceCertificateSchema = z.object({
  id: z.string().uuid().describe('ID сертификата'),
  deviceId: z.string().describe('ID устройства'),
  clientCert: z.string().describe('Клиентский сертификат в формате PEM'),
  caCert: z.string().describe('Корневой CA сертификат в формате PEM'),
  fingerprint: z.string().describe('Отпечаток сертификата (SHA256)'),
  serialNumber: z.string().describe('Серийный номер сертификата'),
  validFrom: z.date().describe('Дата начала действия сертификата'),
  validTo: z.date().describe('Дата окончания действия сертификата'),
  isRevoked: z.boolean().default(false).describe('Отозван ли сертификат'),
  revokedAt: z.date().nullable().describe('Дата отзыва сертификата'),
  createdAt: z.date().describe('Дата создания записи'),
});

/**
 * Схема для запроса создания сертификата
 */
export const CreateCertificateSchema = z.object({
  deviceId: z.string().describe('ID устройства'),
  csr: z.string().describe('Certificate Signing Request в формате PEM'),
  validityDays: z
    .number()
    .min(1)
    .max(3650)
    .default(365)
    .describe('Срок действия сертификата в днях'),
});

/**
 * Схема для запроса отзыва сертификата
 */
export const RevokeCertificateSchema = z.object({
  reason: z
    .enum([
      'unspecified',
      'keyCompromise',
      'caCompromise',
      'affiliationChanged',
      'superseded',
      'cessationOfOperation',
      'certificateHold',
      'removeFromCRL',
    ])
    .default('unspecified')
    .describe('Причина отзыва сертификата'),
});

/**
 * Схема для информации о CA
 */
export const CaInfoSchema = z.object({
  caCert: z.string().describe('Корневой CA сертификат в формате PEM'),
  caFingerprint: z.string().describe('Отпечаток CA сертификата'),
  issuer: z.string().describe('Издатель CA сертификата'),
  validFrom: z.date().describe('Дата начала действия CA'),
  validTo: z.date().describe('Дата окончания действия CA'),
});

/**
 * Схема для генерации ключевой пары
 */
export const GenerateKeyPairSchema = z.object({
  keySize: z
    .enum(['2048', '3072', '4096'])
    .default('2048')
    .describe('Размер ключа в битах'),
  keyType: z.enum(['RSA', 'EC']).default('RSA').describe('Тип ключа'),
  curve: z
    .enum(['P-256', 'P-384', 'P-521'])
    .optional()
    .describe('Кривая для EC ключей'),
});

/**
 * Схема для ключевой пары
 */
export const KeyPairSchema = z.object({
  publicKey: z.string().describe('Публичный ключ в формате PEM'),
  privateKey: z.string().describe('Приватный ключ в формате PEM'),
  keyType: z.string().describe('Тип ключа'),
  keySize: z.number().describe('Размер ключа в битах'),
});

/**
 * Схема для подписи данных
 */
export const SignDataSchema = z.object({
  data: z.string().describe('Данные для подписи (base64)'),
  privateKey: z.string().describe('Приватный ключ для подписи в формате PEM'),
  algorithm: z
    .enum(['SHA256', 'SHA384', 'SHA512'])
    .default('SHA256')
    .describe('Алгоритм хеширования'),
});

/**
 * Схема для проверки подписи
 */
export const VerifySignatureSchema = z.object({
  data: z.string().describe('Исходные данные (base64)'),
  signature: z.string().describe('Подпись (base64)'),
  publicKey: z.string().describe('Публичный ключ для проверки в формате PEM'),
  algorithm: z
    .enum(['SHA256', 'SHA384', 'SHA512'])
    .default('SHA256')
    .describe('Алгоритм хеширования'),
});

/**
 * Схема для шифрования данных
 */
export const EncryptDataSchema = z.object({
  data: z.string().describe('Данные для шифрования (base64)'),
  publicKey: z.string().describe('Публичный ключ для шифрования в формате PEM'),
});

/**
 * Схема для расшифровки данных
 */
export const DecryptDataSchema = z.object({
  encryptedData: z.string().describe('Зашифрованные данные (base64)'),
  privateKey: z
    .string()
    .describe('Приватный ключ для расшифровки в формате PEM'),
});

/**
 * Схема для хеширования данных
 */
export const HashDataSchema = z.object({
  data: z.string().describe('Данные для хеширования (base64)'),
  algorithm: z
    .enum(['SHA256', 'SHA384', 'SHA512', 'MD5'])
    .default('SHA256')
    .describe('Алгоритм хеширования'),
});

/**
 * Схема для результата криптографической операции
 */
export const CryptoResultSchema = z.object({
  result: z.string().describe('Результат операции (base64)'),
  algorithm: z.string().optional().describe('Использованный алгоритм'),
});

/**
 * Схема для проверки результата
 */
export const VerificationResultSchema = z.object({
  isValid: z.boolean().describe('Результат проверки'),
  message: z.string().optional().describe('Дополнительная информация'),
});

/**
 * Схема для параметров поиска сертификатов
 */
export const CertificateQuerySchema = z.object({
  page: z.number().min(1).default(1).describe('Номер страницы'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Количество элементов на странице'),
  deviceId: z.string().optional().describe('Фильтр по ID устройства'),
  isRevoked: z.boolean().optional().describe('Фильтр по статусу отзыва'),
  validFrom: z.date().optional().describe('Сертификаты действительные с даты'),
  validTo: z.date().optional().describe('Сертификаты действительные до даты'),
});

/**
 * Схема для списка сертификатов
 */
export const CertificatesListResponseSchema = z.object({
  certificates: z
    .array(DeviceCertificateSchema)
    .describe('Список сертификатов'),
  total: z.number().describe('Общее количество сертификатов'),
  page: z.number().describe('Текущая страница'),
  limit: z.number().describe('Количество элементов на странице'),
  totalPages: z.number().describe('Общее количество страниц'),
});

/**
 * Типы TypeScript
 */
export type Csr = z.infer<typeof CsrSchema>;
export type DeviceCertificate = z.infer<typeof DeviceCertificateSchema>;
export type CreateCertificate = z.infer<typeof CreateCertificateSchema>;
export type RevokeCertificate = z.infer<typeof RevokeCertificateSchema>;
export type CaInfo = z.infer<typeof CaInfoSchema>;
export type GenerateKeyPair = z.infer<typeof GenerateKeyPairSchema>;
export type KeyPair = z.infer<typeof KeyPairSchema>;
export type SignData = z.infer<typeof SignDataSchema>;
export type VerifySignature = z.infer<typeof VerifySignatureSchema>;
export type EncryptData = z.infer<typeof EncryptDataSchema>;
export type DecryptData = z.infer<typeof DecryptDataSchema>;
export type HashData = z.infer<typeof HashDataSchema>;
export type CryptoResult = z.infer<typeof CryptoResultSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
export type CertificateQuery = z.infer<typeof CertificateQuerySchema>;
export type CertificatesListResponse = z.infer<
  typeof CertificatesListResponseSchema
>;
