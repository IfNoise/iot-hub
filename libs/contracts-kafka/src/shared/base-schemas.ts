import { z } from 'zod';

/**
 * Базовые типы для Kafka-событий
 */

export const DeviceIdSchema = z.string().min(1, 'Device ID is required');
export const UserIdSchema = z.string().uuid('User ID must be a valid UUID');
export const OrganizationIdSchema = z
  .string()
  .uuid('Organization ID must be a valid UUID');
export const CorrelationIdSchema = z
  .string()
  .uuid('Correlation ID must be a valid UUID');

export const TimestampSchema = z.union([
  z.string().datetime('Timestamp must be ISO 8601 format'),
  z.number().int().positive('Timestamp must be positive unix milliseconds'),
]);

/**
 * Источник события
 */
export const EventSourceSchema = z.object({
  type: z.enum(['device', 'backend', 'user', 'system']),
  id: z.string(),
  version: z.string().optional(),
});

/**
 * Базовая схема Kafka-события
 */
export const BaseKafkaEventSchema = z.object({
  eventType: z.string(),
  correlationId: CorrelationIdSchema,
  timestamp: TimestampSchema,
  source: EventSourceSchema,
  __version: z.string().default('v1'),
});

/**
 * Схема для команд
 */
export const BaseKafkaCommandSchema = BaseKafkaEventSchema.extend({
  eventType: z
    .string()
    .regex(/\.command\./, 'Command eventType must contain .command.'),
  timeout: z.number().int().min(1000).max(60000).default(30000),
  responseRequired: z.boolean().default(true),
});

/**
 * Схема для ответов на команды
 */
export const BaseKafkaResponseSchema = BaseKafkaEventSchema.extend({
  eventType: z
    .string()
    .regex(/\.response\./, 'Response eventType must contain .response.'),
  success: z.boolean(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.any()).optional(),
    })
    .optional(),
});

/**
 * Схема для доменных событий
 */
export const BaseDomainEventSchema = BaseKafkaEventSchema.extend({
  eventType: z
    .string()
    .regex(
      /\.(created|updated|deleted|changed)$/,
      'Domain event must end with lifecycle verb'
    ),
});

/**
 * Типы
 */
export type DeviceId = z.infer<typeof DeviceIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type OrganizationId = z.infer<typeof OrganizationIdSchema>;
export type CorrelationId = z.infer<typeof CorrelationIdSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type EventSource = z.infer<typeof EventSourceSchema>;

export type BaseKafkaEvent = z.infer<typeof BaseKafkaEventSchema>;
export type BaseKafkaCommand = z.infer<typeof BaseKafkaCommandSchema>;
export type BaseKafkaResponse = z.infer<typeof BaseKafkaResponseSchema>;
export type BaseDomainEvent = z.infer<typeof BaseDomainEventSchema>;
