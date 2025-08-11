/**
 * IoT Hub Kafka Contracts v1
 *
 * Event-driven контракты для Kafka-архитектуры
 */

// Version
export { VERSION } from './version.js';

// Base schemas and types
export * from './shared/base-schemas.js';
export * from './shared/topics.js';

// v1 Contracts
export * from './v1/device-commands.js';
export * from './v1/device-events.js';
export * from './v1/user-events.js';
export * from './v1/organization-events.js';
export * from './v1/certificate-events.js';
export * from './v1/integration-events.js';
export * from './v1/keycloak-events.js';

// Utility types for discriminated unions
import { z } from 'zod';
import {
  DeviceCommandSchemas,
  DeviceCommandResponseSchemas,
} from './v1/device-commands.js';
import { DeviceEventSchemas } from './v1/device-events.js';
import { UserCommandSchemas, UserEventSchemas } from './v1/user-events.js';
import {
  OrganizationCommandSchemas,
  OrganizationEventSchemas,
} from './v1/organization-events.js';
import {
  CertificateCommandSchemas,
  CertificateEventSchemas,
} from './v1/certificate-events.js';
import { IntegrationEventSchemas } from './v1/integration-events.js';

/**
 * Все Kafka-команды
 */
export const AllKafkaCommandSchemas = z.discriminatedUnion('eventType', [
  ...DeviceCommandSchemas.options,
  ...UserCommandSchemas.options,
  ...OrganizationCommandSchemas.options,
  ...CertificateCommandSchemas.options,
]);

/**
 * Все Kafka-события (без команд)
 */
export const AllKafkaEventSchemas = z.discriminatedUnion('eventType', [
  ...DeviceEventSchemas.options,
  ...UserEventSchemas.options,
  ...OrganizationEventSchemas.options,
  ...CertificateEventSchemas.options,
  ...IntegrationEventSchemas.options,
]);

/**
 * Все Kafka-ответы на команды
 */
export const AllKafkaResponseSchemas = z.discriminatedUnion('eventType', [
  ...DeviceCommandResponseSchemas.options,
]);

/**
 * Объединенная схема всех Kafka-сообщений
 */
export const AllKafkaMessageSchemas = z.discriminatedUnion('eventType', [
  ...AllKafkaCommandSchemas.options,
  ...AllKafkaEventSchemas.options,
  ...AllKafkaResponseSchemas.options,
]);

/**
 * Типы
 */
export type AllKafkaCommand = z.infer<typeof AllKafkaCommandSchemas>;
export type AllKafkaEvent = z.infer<typeof AllKafkaEventSchemas>;
export type AllKafkaResponse = z.infer<typeof AllKafkaResponseSchemas>;
export type AllKafkaMessage = z.infer<typeof AllKafkaMessageSchemas>;
