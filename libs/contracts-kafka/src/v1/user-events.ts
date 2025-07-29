import { z } from 'zod';
import {
  BaseDomainEventSchema,
  BaseKafkaCommandSchema,
  UserIdSchema,
  OrganizationIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * USER COMMANDS
 * =============================================
 */

/**
 * Команда: Создать пользователя
 */
export const UserCreateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('user.command.create'),
  payload: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    organizationId: OrganizationIdSchema.optional(),
    role: z.enum(['user', 'admin', 'owner']).default('user'),
    invitedBy: UserIdSchema.optional(),
  }),
});

/**
 * Команда: Обновить пользователя
 */
export const UserUpdateCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('user.command.update'),
  payload: z.object({
    userId: UserIdSchema,
    updates: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'admin', 'owner']).optional(),
      isActive: z.boolean().optional(),
    }),
    updatedBy: UserIdSchema,
  }),
});

/**
 * Команда: Удалить пользователя
 */
export const UserDeleteCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('user.command.delete'),
  payload: z.object({
    userId: UserIdSchema,
    deletedBy: UserIdSchema,
    reason: z.string().optional(),
    hardDelete: z.boolean().default(false),
  }),
});

/**
 * =============================================
 * USER EVENTS
 * =============================================
 */

/**
 * Событие: Пользователь создан
 */
export const UserCreatedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('user.created'),
  payload: z.object({
    userId: UserIdSchema,
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    organizationId: OrganizationIdSchema.optional(),
    role: z.enum(['user', 'admin', 'owner']),
    createdAt: z.string().datetime(),
    createdBy: UserIdSchema.optional(),
    isActive: z.boolean().default(true),
  }),
});

/**
 * Событие: Пользователь обновлен
 */
export const UserUpdatedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('user.updated'),
  payload: z.object({
    userId: UserIdSchema,
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
 * Событие: Пользователь удален
 */
export const UserDeletedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('user.deleted'),
  payload: z.object({
    userId: UserIdSchema,
    email: z.string().email(),
    deletedBy: UserIdSchema,
    deletedAt: z.string().datetime(),
    reason: z.string().optional(),
    hardDelete: z.boolean(),
    devicesCount: z.number().default(0),
  }),
});

/**
 * Событие: Пользователь активирован/деактивирован
 */
export const UserStatusChangedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('user.status.changed'),
  payload: z.object({
    userId: UserIdSchema,
    previousStatus: z.enum(['active', 'inactive', 'suspended', 'pending']),
    currentStatus: z.enum(['active', 'inactive', 'suspended', 'pending']),
    changedBy: UserIdSchema,
    changedAt: z.string().datetime(),
    reason: z.string().optional(),
  }),
});

/**
 * =============================================
 * AUTHENTICATION EVENTS
 * =============================================
 */

/**
 * Событие: Пользователь вошел в систему
 */
export const UserSignedInEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('auth.user.signedIn'),
  payload: z.object({
    userId: UserIdSchema,
    sessionId: z.string(),
    signedInAt: z.string().datetime(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    method: z.enum(['password', 'oauth', 'token', 'sso']),
    provider: z.string().optional(),
  }),
});

/**
 * Событие: Пользователь вышел из системы
 */
export const UserSignedOutEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('auth.user.signedOut'),
  payload: z.object({
    userId: UserIdSchema,
    sessionId: z.string(),
    signedOutAt: z.string().datetime(),
    reason: z.enum(['manual', 'timeout', 'admin', 'security']),
  }),
});

/**
 * Событие: Неудачная попытка входа
 */
export const UserSignInFailedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('auth.user.signInFailed'),
  payload: z.object({
    email: z.string().email().optional(),
    failedAt: z.string().datetime(),
    reason: z.enum([
      'invalid_credentials',
      'account_locked',
      'account_inactive',
      'rate_limited',
    ]),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    attemptCount: z.number().default(1),
  }),
});

/**
 * =============================================
 * UNION SCHEMAS
 * =============================================
 */

export const UserCommandSchemas = z.discriminatedUnion('eventType', [
  UserCreateCommandSchema,
  UserUpdateCommandSchema,
  UserDeleteCommandSchema,
]);

export const UserEventSchemas = z.discriminatedUnion('eventType', [
  UserCreatedEventSchema,
  UserUpdatedEventSchema,
  UserDeletedEventSchema,
  UserStatusChangedEventSchema,
  UserSignedInEventSchema,
  UserSignedOutEventSchema,
  UserSignInFailedEventSchema,
]);

/**
 * =============================================
 * TYPES
 * =============================================
 */

export type UserCreateCommand = z.infer<typeof UserCreateCommandSchema>;
export type UserUpdateCommand = z.infer<typeof UserUpdateCommandSchema>;
export type UserDeleteCommand = z.infer<typeof UserDeleteCommandSchema>;
export type UserCommand = z.infer<typeof UserCommandSchemas>;

export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>;
export type UserDeletedEvent = z.infer<typeof UserDeletedEventSchema>;
export type UserStatusChangedEvent = z.infer<
  typeof UserStatusChangedEventSchema
>;
export type UserSignedInEvent = z.infer<typeof UserSignedInEventSchema>;
export type UserSignedOutEvent = z.infer<typeof UserSignedOutEventSchema>;
export type UserSignInFailedEvent = z.infer<typeof UserSignInFailedEventSchema>;

export type UserEvent = z.infer<typeof UserEventSchemas>;
