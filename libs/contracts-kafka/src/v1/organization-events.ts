import { z } from 'zod';
import {
  BaseDomainEventSchema,
  BaseKafkaCommandSchema,
  UserIdSchema,
  OrganizationIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * ORGANIZATION COMMANDS
 * =============================================
 */

/**
 * Команда: Создать организацию
 */
export const OrganizationCreateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('organization.command.create'),
  payload: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1).optional(),
    domain: z.string().optional(),
    description: z.string().optional(),
    ownerId: UserIdSchema,
    settings: z.record(z.unknown()).optional(),
  }),
});

/**
 * Команда: Обновить организацию
 */
export const OrganizationUpdateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('organization.command.update'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    updates: z.object({
      name: z.string().min(1).optional(),
      displayName: z.string().min(1).optional(),
      domain: z.string().optional(),
      description: z.string().optional(),
      settings: z.record(z.unknown()).optional(),
      isEnabled: z.boolean().optional(),
    }),
    updatedBy: UserIdSchema,
  }),
});

/**
 * Команда: Удалить организацию
 */
export const OrganizationDeleteCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('organization.command.delete'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    deletedBy: UserIdSchema,
    reason: z.string().optional(),
    hardDelete: z.boolean().default(false),
  }),
});

/**
 * =============================================
 * ORGANIZATION EVENTS
 * =============================================
 */

/**
 * Событие: Организация создана
 */
export const OrganizationCreatedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('organization.created'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    name: z.string(),
    displayName: z.string().optional(),
    domain: z.string().optional(),
    description: z.string().optional(),
    ownerId: UserIdSchema,
    createdAt: z.string().datetime(),
    isEnabled: z.boolean().default(true),
    settings: z.record(z.unknown()).optional(),
    // Данные из Keycloak
    keycloakId: z.string().optional(),
    keycloakEventId: z.string().optional(),
  }),
});

/**
 * Событие: Организация обновлена
 */
export const OrganizationUpdatedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('organization.updated'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    previousData: z.record(z.unknown()),
    newData: z.record(z.unknown()),
    updatedBy: UserIdSchema,
    updatedAt: z.string().datetime(),
    changes: z.array(
      z.object({
        field: z.string(),
        oldValue: z.unknown(),
        newValue: z.unknown(),
      })
    ),
  }),
});

/**
 * Событие: Организация удалена
 */
export const OrganizationDeletedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('organization.deleted'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    name: z.string(),
    deletedBy: UserIdSchema,
    deletedAt: z.string().datetime(),
    reason: z.string().optional(),
    hardDelete: z.boolean(),
    preservedData: z.record(z.unknown()).optional(),
  }),
});

/**
 * Событие: Пользователь добавлен в организацию
 */
export const OrganizationMemberAddedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('organization.member.added'),
  payload: z.object({
    organizationId: OrganizationIdSchema,
    userId: UserIdSchema,
    role: z.enum(['user', 'admin', 'owner']),
    addedBy: UserIdSchema,
    addedAt: z.string().datetime(),
    // Данные из Keycloak
    keycloakEventId: z.string().optional(),
  }),
});

/**
 * Событие: Пользователь удален из организации
 */
export const OrganizationMemberRemovedEventSchema =
  BaseDomainEventSchema.extend({
    eventType: z.literal('organization.member.removed'),
    payload: z.object({
      organizationId: OrganizationIdSchema,
      userId: UserIdSchema,
      removedBy: UserIdSchema,
      removedAt: z.string().datetime(),
      reason: z.string().optional(),
    }),
  });

/**
 * Событие: Роль пользователя в организации изменена
 */
export const OrganizationMemberRoleChangedEventSchema =
  BaseDomainEventSchema.extend({
    eventType: z.literal('organization.member.role-changed'),
    payload: z.object({
      organizationId: OrganizationIdSchema,
      userId: UserIdSchema,
      previousRole: z.enum(['user', 'admin', 'owner']),
      newRole: z.enum(['user', 'admin', 'owner']),
      changedBy: UserIdSchema,
      changedAt: z.string().datetime(),
    }),
  });

/**
 * =============================================
 * EXPORTS
 * =============================================
 */

/**
 * Команды организаций
 */
export const OrganizationCommandSchemas = z.discriminatedUnion('eventType', [
  OrganizationCreateCommandSchema,
  OrganizationUpdateCommandSchema,
  OrganizationDeleteCommandSchema,
]);

/**
 * События организаций
 */
export const OrganizationEventSchemas = z.discriminatedUnion('eventType', [
  OrganizationCreatedEventSchema,
  OrganizationUpdatedEventSchema,
  OrganizationDeletedEventSchema,
  OrganizationMemberAddedEventSchema,
  OrganizationMemberRemovedEventSchema,
  OrganizationMemberRoleChangedEventSchema,
]);

/**
 * Типы
 */
export type OrganizationCreateCommand = z.infer<
  typeof OrganizationCreateCommandSchema
>;
export type OrganizationUpdateCommand = z.infer<
  typeof OrganizationUpdateCommandSchema
>;
export type OrganizationDeleteCommand = z.infer<
  typeof OrganizationDeleteCommandSchema
>;

export type OrganizationCreatedEvent = z.infer<
  typeof OrganizationCreatedEventSchema
>;
export type OrganizationUpdatedEvent = z.infer<
  typeof OrganizationUpdatedEventSchema
>;
export type OrganizationDeletedEvent = z.infer<
  typeof OrganizationDeletedEventSchema
>;
export type OrganizationMemberAddedEvent = z.infer<
  typeof OrganizationMemberAddedEventSchema
>;
export type OrganizationMemberRemovedEvent = z.infer<
  typeof OrganizationMemberRemovedEventSchema
>;
export type OrganizationMemberRoleChangedEvent = z.infer<
  typeof OrganizationMemberRoleChangedEventSchema
>;

export type OrganizationCommand = z.infer<typeof OrganizationCommandSchemas>;
export type OrganizationEvent = z.infer<typeof OrganizationEventSchemas>;
