import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Схема для запроса подписания CSR
 */
export const SignCSRSchema = z.object({
  csrPem: z.string(),
  firmwareVersion: z.string().optional(),
  hardwareVersion: z.string().optional(),
});

/**
 * Схема ответа с сертификатом
 */
export const CertificateResponseSchema = z.object({
  certificate: z.string(),
  caCertificate: z.string(),
  fingerprint: z.string(),
});

/**
 * Схема информации о сертификате
 */
export const CertificateInfoSchema = z.object({
  deviceId: z.string(),
  serialNumber: z.string(),
  validFrom: z.string(),
  validTo: z.string(),
  status: z.enum(['active', 'revoked', 'expired']),
  fingerprint: z.string(),
});

/**
 * Схема ответа на отзыв сертификата
 */
export const RevokeCertificateResponseSchema = z.object({
  message: z.string(),
  deviceId: z.string(),
  timestamp: z.string(),
});

/**
 * Схема ответа с CA сертификатом
 */
export const CACertificateResponseSchema = z.object({
  caCert: z.string(),
  pemFormat: z.boolean(),
  timestamp: z.string(),
});

/**
 * Схема запроса от EMQX для валидации сертификата
 */
export const EMQXValidationRequestSchema = z.object({
  clientid: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  cert_subject: z.string().optional(),
  cert_common_name: z.string().optional(),
});

/**
 * Схема ответа для EMQX валидации
 */
export const EMQXValidationResponseSchema = z.object({
  result: z.enum(['allow', 'deny', 'ignore']),
  is_superuser: z.boolean().optional(),
  client_attrs: z.record(z.string()).optional(),
});

/**
 * REST API контракты для сертификатов устройств
 * Соответствуют реальным эндпоинтам в CertificatesController
 */
export const certificatesContract = c.router({
  // POST /devices/certificates/:deviceId/sign-csr - Подписание CSR устройства
  signDeviceCSR: {
    method: 'POST',
    path: '/devices/certificates/:deviceId/sign-csr',
    pathParams: z.object({
      deviceId: z.string(),
    }),
    body: SignCSRSchema,
    responses: {
      201: CertificateResponseSchema,
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
      409: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: 'Подписание CSR от устройства',
  },

  // GET /devices/certificates/:deviceId/certificate - Получение информации о сертификате устройства
  getCertificateInfo: {
    method: 'GET',
    path: '/devices/certificates/:deviceId/certificate',
    pathParams: z.object({
      deviceId: z.string(),
    }),
    responses: {
      200: CertificateInfoSchema,
      404: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: 'Получение информации о сертификате устройства',
  },

  // DELETE /devices/certificates/:deviceId/certificate - Отзыв сертификата устройства
  revokeCertificate: {
    method: 'DELETE',
    path: '/devices/certificates/:deviceId/certificate',
    pathParams: z.object({
      deviceId: z.string(),
    }),
    responses: {
      200: RevokeCertificateResponseSchema,
      404: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: 'Отзыв сертификата устройства',
  },

  // GET /devices/certificates/ca-certificate - Получение CA сертификата
  getCACertificate: {
    method: 'GET',
    path: '/devices/certificates/ca-certificate',
    responses: {
      200: CACertificateResponseSchema,
      500: z.object({ message: z.string() }),
    },
    summary: 'Получение CA сертификата',
  },

  // POST /devices/certificates/validate - Валидация сертификата для EMQX
  validateCertificate: {
    method: 'POST',
    path: '/devices/certificates/validate',
    body: EMQXValidationRequestSchema,
    responses: {
      200: EMQXValidationResponseSchema,
      500: z.object({ message: z.string() }),
    },
    summary: 'Валидация сертификата устройства для EMQX',
  },
});

export type CertificatesContract = typeof certificatesContract;
