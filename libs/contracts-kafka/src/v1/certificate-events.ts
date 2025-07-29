import { z } from 'zod';
import {
  BaseDomainEventSchema,
  BaseKafkaCommandSchema,
  BaseKafkaResponseSchema,
  DeviceIdSchema,
  UserIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * CERTIFICATE COMMANDS
 * =============================================
 */

/**
 * Команда: Создать сертификат для устройства
 */
export const CertificateCreateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('certificate.command.create'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    certificateType: z.enum(['client', 'server', 'ca']),
    keySize: z.enum([2048, 4096]).default(2048),
    validityDays: z.number().int().min(1).max(3650).default(365),
    requestedBy: UserIdSchema,
    metadata: z.object({
      commonName: z.string(),
      organization: z.string().optional(),
      country: z.string().length(2).optional(),
      state: z.string().optional(),
      locality: z.string().optional(),
      emailAddress: z.string().email().optional(),
    }),
  }),
});

/**
 * Команда: Отозвать сертификат
 */
export const CertificateRevokeCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('certificate.command.revoke'),
  payload: z.object({
    certificateId: z.string(),
    reason: z.enum([
      'unspecified',
      'keyCompromise',
      'caCompromise',
      'affiliationChanged',
      'superseded',
      'cessationOfOperation',
      'certificateHold',
    ]),
    revokedBy: UserIdSchema,
    notifyDevice: z.boolean().default(true),
  }),
});

/**
 * Команда: Обновить сертификат
 */
export const CertificateRenewCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('certificate.command.renew'),
  payload: z.object({
    certificateId: z.string(),
    validityDays: z.number().int().min(1).max(3650).default(365),
    requestedBy: UserIdSchema,
    keepPrivateKey: z.boolean().default(false),
  }),
});

/**
 * =============================================
 * CERTIFICATE RESPONSES
 * =============================================
 */

/**
 * Ответ на создание сертификата
 */
export const CertificateCreateResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('certificate.response.create'),
  payload: z.object({
    certificateId: z.string(),
    deviceId: DeviceIdSchema,
    certificatePem: z.string().optional(),
    privateKeyPem: z.string().optional(),
    caCertificatePem: z.string().optional(),
    serialNumber: z.string().optional(),
    fingerprint: z.string().optional(),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
  }),
});

/**
 * =============================================
 * CERTIFICATE EVENTS
 * =============================================
 */

/**
 * Событие: Сертификат создан
 */
export const CertificateCreatedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('certificate.created'),
  payload: z.object({
    certificateId: z.string(),
    deviceId: DeviceIdSchema,
    certificateType: z.enum(['client', 'server', 'ca']),
    serialNumber: z.string(),
    fingerprint: z.string(),
    commonName: z.string(),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime(),
    keySize: z.number(),
    createdBy: UserIdSchema,
    createdAt: z.string().datetime(),
    metadata: z.record(z.any()).optional(),
  }),
});

/**
 * Событие: Сертификат отозван
 */
export const CertificateRevokedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('certificate.revoked'),
  payload: z.object({
    certificateId: z.string(),
    deviceId: DeviceIdSchema,
    serialNumber: z.string(),
    reason: z.enum([
      'unspecified',
      'keyCompromise',
      'caCompromise',
      'affiliationChanged',
      'superseded',
      'cessationOfOperation',
      'certificateHold',
    ]),
    revokedBy: UserIdSchema,
    revokedAt: z.string().datetime(),
    previousValidTo: z.string().datetime(),
  }),
});

/**
 * Событие: Сертификат обновлен
 */
export const CertificateRenewedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('certificate.renewed'),
  payload: z.object({
    oldCertificateId: z.string(),
    newCertificateId: z.string(),
    deviceId: DeviceIdSchema,
    renewedBy: UserIdSchema,
    renewedAt: z.string().datetime(),
    oldValidTo: z.string().datetime(),
    newValidTo: z.string().datetime(),
    privateKeyChanged: z.boolean(),
  }),
});

/**
 * Событие: Сертификат истекает
 */
export const CertificateExpiringEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('certificate.expiring'),
  payload: z.object({
    certificateId: z.string(),
    deviceId: DeviceIdSchema,
    serialNumber: z.string(),
    validTo: z.string().datetime(),
    daysUntilExpiry: z.number(),
    warningLevel: z.enum(['info', 'warning', 'critical']),
    autoRenewalEnabled: z.boolean(),
  }),
});

/**
 * Событие: Сертификат истек
 */
export const CertificateExpiredEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('certificate.expired'),
  payload: z.object({
    certificateId: z.string(),
    deviceId: DeviceIdSchema,
    serialNumber: z.string(),
    expiredAt: z.string().datetime(),
    wasAutoRenewalAttempted: z.boolean(),
    autoRenewalSuccess: z.boolean().optional(),
  }),
});

/**
 * =============================================
 * UNION SCHEMAS
 * =============================================
 */

export const CertificateCommandSchemas = z.discriminatedUnion('eventType', [
  CertificateCreateCommandSchema,
  CertificateRevokeCommandSchema,
  CertificateRenewCommandSchema,
]);

export const CertificateResponseSchemas = z.discriminatedUnion('eventType', [
  CertificateCreateResponseSchema,
]);

export const CertificateEventSchemas = z.discriminatedUnion('eventType', [
  CertificateCreatedEventSchema,
  CertificateRevokedEventSchema,
  CertificateRenewedEventSchema,
  CertificateExpiringEventSchema,
  CertificateExpiredEventSchema,
]);

/**
 * =============================================
 * TYPES
 * =============================================
 */

export type CertificateCreateCommand = z.infer<
  typeof CertificateCreateCommandSchema
>;
export type CertificateRevokeCommand = z.infer<
  typeof CertificateRevokeCommandSchema
>;
export type CertificateRenewCommand = z.infer<
  typeof CertificateRenewCommandSchema
>;
export type CertificateCommand = z.infer<typeof CertificateCommandSchemas>;

export type CertificateCreateResponse = z.infer<
  typeof CertificateCreateResponseSchema
>;
export type CertificateResponse = z.infer<typeof CertificateResponseSchemas>;

export type CertificateCreatedEvent = z.infer<
  typeof CertificateCreatedEventSchema
>;
export type CertificateRevokedEvent = z.infer<
  typeof CertificateRevokedEventSchema
>;
export type CertificateRenewedEvent = z.infer<
  typeof CertificateRenewedEventSchema
>;
export type CertificateExpiringEvent = z.infer<
  typeof CertificateExpiringEventSchema
>;
export type CertificateExpiredEvent = z.infer<
  typeof CertificateExpiredEventSchema
>;
export type CertificateEvent = z.infer<typeof CertificateEventSchemas>;
