import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  DeviceCertificateSchema,
  CreateCertificateSchema,
  RevokeCertificateSchema,
  CaInfoSchema,
  GenerateKeyPairSchema,
  KeyPairSchema,
  SignDataSchema,
  VerifySignatureSchema,
  EncryptDataSchema,
  DecryptDataSchema,
  HashDataSchema,
  CryptoResultSchema,
  VerificationResultSchema,
  CertificateQuerySchema,
  CertificatesListResponseSchema,
} from './crypto-schemas.js';

const c = initContract();

/**
 * REST API контракты для управления сертификатами
 */
export const certificatesContract = c.router({
  // Получить список сертификатов
  getCertificates: {
    method: 'GET',
    path: '/crypto/certificates',
    query: CertificateQuerySchema,
    responses: {
      200: CertificatesListResponseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить список сертификатов',
    description:
      'Возвращает список сертификатов с поддержкой пагинации и фильтрации',
  },

  // Получить сертификат по ID
  getCertificate: {
    method: 'GET',
    path: '/crypto/certificates/:id',
    pathParams: z.object({
      id: z.string().uuid().describe('ID сертификата'),
    }),
    responses: {
      200: DeviceCertificateSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить сертификат по ID',
    description:
      'Возвращает данные сертификата по его уникальному идентификатору',
  },

  // Получить сертификат устройства
  getDeviceCertificate: {
    method: 'GET',
    path: '/crypto/certificates/device/:deviceId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
    }),
    responses: {
      200: DeviceCertificateSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить сертификат устройства',
    description: 'Возвращает активный сертификат устройства',
  },

  // Создать сертификат для устройства
  createCertificate: {
    method: 'POST',
    path: '/crypto/certificates',
    body: CreateCertificateSchema,
    responses: {
      201: DeviceCertificateSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      409: z.object({ message: z.string() }), // Certificate already exists
    },
    summary: 'Создать сертификат',
    description: 'Создает новый сертификат для устройства на основе CSR',
  },

  // Отозвать сертификат
  revokeCertificate: {
    method: 'POST',
    path: '/crypto/certificates/:id/revoke',
    pathParams: z.object({
      id: z.string().uuid().describe('ID сертификата'),
    }),
    body: RevokeCertificateSchema,
    responses: {
      200: DeviceCertificateSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Отозвать сертификат',
    description: 'Отзывает сертификат устройства',
  },

  // Получить информацию о CA
  getCaInfo: {
    method: 'GET',
    path: '/crypto/ca',
    responses: {
      200: CaInfoSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить информацию о CA',
    description: 'Возвращает информацию о корневом сертификате CA',
  },

  // Скачать CA сертификат
  downloadCaCertificate: {
    method: 'GET',
    path: '/crypto/ca/download',
    responses: {
      200: z.string().describe('CA сертификат в формате PEM'),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Скачать CA сертификат',
    description: 'Возвращает корневой CA сертификат для скачивания',
  },
});

/**
 * REST API контракты для криптографических операций
 */
export const cryptoContract = c.router({
  // Генерация ключевой пары
  generateKeyPair: {
    method: 'POST',
    path: '/crypto/keys/generate',
    body: GenerateKeyPairSchema,
    responses: {
      200: KeyPairSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Генерация ключевой пары',
    description: 'Генерирует новую пару ключей (публичный и приватный)',
  },

  // Подпись данных
  signData: {
    method: 'POST',
    path: '/crypto/sign',
    body: SignDataSchema,
    responses: {
      200: CryptoResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Подписать данные',
    description: 'Создает цифровую подпись для данных',
  },

  // Проверка подписи
  verifySignature: {
    method: 'POST',
    path: '/crypto/verify',
    body: VerifySignatureSchema,
    responses: {
      200: VerificationResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Проверить подпись',
    description: 'Проверяет цифровую подпись данных',
  },

  // Шифрование данных
  encryptData: {
    method: 'POST',
    path: '/crypto/encrypt',
    body: EncryptDataSchema,
    responses: {
      200: CryptoResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Зашифровать данные',
    description: 'Шифрует данные с использованием публичного ключа',
  },

  // Расшифровка данных
  decryptData: {
    method: 'POST',
    path: '/crypto/decrypt',
    body: DecryptDataSchema,
    responses: {
      200: CryptoResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Расшифровать данные',
    description: 'Расшифровывает данные с использованием приватного ключа',
  },

  // Хеширование данных
  hashData: {
    method: 'POST',
    path: '/crypto/hash',
    body: HashDataSchema,
    responses: {
      200: CryptoResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Хешировать данные',
    description: 'Вычисляет хеш данных с использованием указанного алгоритма',
  },

  // Проверка сертификата
  verifyCertificate: {
    method: 'POST',
    path: '/crypto/certificates/verify',
    body: z.object({
      certificate: z.string().describe('Сертификат в формате PEM'),
    }),
    responses: {
      200: z.object({
        isValid: z.boolean().describe('Действителен ли сертификат'),
        issuer: z.string().describe('Издатель сертификата'),
        subject: z.string().describe('Субъект сертификата'),
        validFrom: z.date().describe('Дата начала действия'),
        validTo: z.date().describe('Дата окончания действия'),
        fingerprint: z.string().describe('Отпечаток сертификата'),
        errors: z
          .array(z.string())
          .optional()
          .describe('Список ошибок валидации'),
      }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Проверить сертификат',
    description: 'Проверяет валидность сертификата',
  },

  // Создать CSR
  createCsr: {
    method: 'POST',
    path: '/crypto/csr',
    body: z.object({
      privateKey: z.string().describe('Приватный ключ в формате PEM'),
      subject: z.object({
        commonName: z.string().describe('Common Name (CN)'),
        organizationName: z
          .string()
          .optional()
          .describe('Organization Name (O)'),
        organizationalUnitName: z
          .string()
          .optional()
          .describe('Organizational Unit Name (OU)'),
        countryName: z
          .string()
          .length(2)
          .optional()
          .describe('Country Name (C)'),
        stateOrProvinceName: z
          .string()
          .optional()
          .describe('State or Province Name (ST)'),
        localityName: z.string().optional().describe('Locality Name (L)'),
      }),
    }),
    responses: {
      200: z.object({
        csr: z.string().describe('Certificate Signing Request в формате PEM'),
      }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Создать CSR',
    description: 'Создает Certificate Signing Request',
  },
});

export type CertificatesContract = typeof certificatesContract;
export type CryptoContract = typeof cryptoContract;
