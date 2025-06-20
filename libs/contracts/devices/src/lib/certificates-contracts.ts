import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CertificateSchema } from './device-schemas.js';

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
 * REST API контракты для сертификатов устройств
 * Соответствуют реальным эндпоинтам в CertificatesController
 */
export const certificatesContract = c.router({
  // POST /devices/certificates/sign-csr - Подписание CSR
  signCSR: {
    method: 'POST',
    path: '/devices/certificates/sign-csr',
    body: SignCSRSchema,
    responses: {
      200: CertificateResponseSchema,
      400: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
    summary: 'Подписание CSR и выдача сертификата',
  },

  // GET /devices/certificates/:fingerprint - Получение сертификата по отпечатку
  getCertificate: {
    method: 'GET',
    path: '/devices/certificates/:fingerprint',
    pathParams: z.object({
      fingerprint: z.string(),
    }),
    responses: {
      200: CertificateSchema,
      404: z.object({ message: z.string() }),
    },
    summary: 'Получение сертификата по отпечатку',
  },

  // DELETE /devices/certificates/:fingerprint - Отзыв сертификата
  revokeCertificate: {
    method: 'DELETE',
    path: '/devices/certificates/:fingerprint',
    pathParams: z.object({
      fingerprint: z.string(),
    }),
    responses: {
      200: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Отзыв сертификата',
  },
});

export type CertificatesContract = typeof certificatesContract;
