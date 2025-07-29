import { z } from 'zod';
import {
  BaseDomainEventSchema,
  BaseKafkaEventSchema,
  DeviceIdSchema,
  UserIdSchema,
  OrganizationIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * DEVICE DOMAIN EVENTS
 * =============================================
 */

/**
 * Событие: Устройство зарегистрировано
 */
export const DeviceRegisteredEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('device.registered'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    manufacturerId: z.string(),
    model: z.string(),
    firmwareVersion: z.string(),
    hardwareRevision: z.string().optional(),
    serialNumber: z.string().optional(),
    capabilities: z.array(z.string()).default([]),
    registeredBy: z.enum(['manufacturer', 'system', 'admin']),
    registeredAt: z.string().datetime(),
    metadata: z.record(z.any()).optional(),
  }),
});

/**
 * Событие: Устройство привязано к пользователю
 */
export const DeviceBoundEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('device.bound'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    userId: UserIdSchema,
    organizationId: OrganizationIdSchema.optional(),
    boundAt: z.string().datetime(),
    deviceName: z.string().optional(),
    boundBy: z.enum(['user', 'admin', 'system']),
  }),
});

/**
 * Событие: Устройство отвязано
 */
export const DeviceUnboundEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('device.unbound'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    previousUserId: UserIdSchema,
    unboundAt: z.string().datetime(),
    reason: z.string().optional(),
    unboundBy: z.enum(['user', 'admin', 'system']),
  }),
});

/**
 * Событие: Конфигурация устройства обновлена
 */
export const DeviceConfigurationUpdatedEventSchema =
  BaseDomainEventSchema.extend({
    eventType: z.literal('device.configuration.updated'),
    payload: z.object({
      deviceId: DeviceIdSchema,
      previousConfiguration: z.record(z.any()),
      newConfiguration: z.record(z.any()),
      updatedBy: UserIdSchema,
      updatedAt: z.string().datetime(),
      changes: z.array(
        z.object({
          field: z.string(),
          oldValue: z.any(),
          newValue: z.any(),
        })
      ),
    }),
  });

/**
 * Событие: Статус устройства изменен
 */
export const DeviceStatusChangedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('device.status.changed'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    previousStatus: z.enum([
      'online',
      'offline',
      'error',
      'sleep',
      'maintenance',
    ]),
    currentStatus: z.enum([
      'online',
      'offline',
      'error',
      'sleep',
      'maintenance',
    ]),
    changedAt: z.string().datetime(),
    reason: z.string().optional(),
    metadata: z
      .object({
        lastSeen: z.string().datetime().optional(),
        batteryLevel: z.number().min(0).max(100).optional(),
        signalStrength: z.number().optional(),
        temperature: z.number().optional(),
      })
      .optional(),
  }),
});

/**
 * Событие: Устройство удалено
 */
export const DeviceDeletedEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('device.deleted'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    deletedBy: UserIdSchema,
    deletedAt: z.string().datetime(),
    reason: z.string().optional(),
    wasManufacturingDevice: z.boolean(),
    wasBoundToUser: z.boolean(),
    lastUserId: UserIdSchema.optional(),
  }),
});

/**
 * =============================================
 * TELEMETRY EVENTS
 * =============================================
 */

/**
 * Событие: Получена телеметрия от устройства
 */
export const DeviceTelemetryReceivedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('device.telemetry.received'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    receivedAt: z.string().datetime(),
    telemetryType: z.enum(['sensors', 'status', 'diagnostics', 'location']),
    data: z.object({
      // Sensor data
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      pressure: z.number().optional(),
      analogInputs: z
        .array(
          z.object({
            id: z.string(),
            value: z.number(),
            unit: z.string().optional(),
          })
        )
        .optional(),
      discreteInputs: z
        .array(
          z.object({
            id: z.string(),
            state: z.boolean(),
          })
        )
        .optional(),

      // Status data
      batteryLevel: z.number().min(0).max(100).optional(),
      signalStrength: z.number().optional(),
      uptime: z.number().optional(),

      // Diagnostics
      memoryUsage: z.number().optional(),
      cpuUsage: z.number().optional(),
      errorCount: z.number().optional(),

      // Location
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      altitude: z.number().optional(),

      // Custom fields
      custom: z.record(z.any()).optional(),
    }),
    metadata: z
      .object({
        protocol: z.enum(['mqtt', 'coap', 'http', 'lora']),
        qos: z.number().optional(),
        retain: z.boolean().optional(),
        topic: z.string().optional(),
      })
      .optional(),
  }),
});

/**
 * =============================================
 * ALERT EVENTS
 * =============================================
 */

/**
 * Событие: Поднято предупреждение устройства
 */
export const DeviceAlertRaisedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('device.alert.raised'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    alertId: z.string(),
    alertType: z.enum([
      'threshold',
      'connectivity',
      'battery',
      'error',
      'security',
      'maintenance',
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    description: z.string(),
    raisedAt: z.string().datetime(),
    triggerValue: z.any().optional(),
    thresholdValue: z.any().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

/**
 * Событие: Предупреждение устройства разрешено
 */
export const DeviceAlertResolvedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('device.alert.resolved'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    alertId: z.string(),
    resolvedAt: z.string().datetime(),
    resolvedBy: z.enum(['system', 'user', 'device']),
    resolutionReason: z.string().optional(),
    userId: UserIdSchema.optional(),
  }),
});

/**
 * =============================================
 * UNION SCHEMAS
 * =============================================
 */

export const DeviceEventSchemas = z.discriminatedUnion('eventType', [
  DeviceRegisteredEventSchema,
  DeviceBoundEventSchema,
  DeviceUnboundEventSchema,
  DeviceConfigurationUpdatedEventSchema,
  DeviceStatusChangedEventSchema,
  DeviceDeletedEventSchema,
  DeviceTelemetryReceivedEventSchema,
  DeviceAlertRaisedEventSchema,
  DeviceAlertResolvedEventSchema,
]);

/**
 * =============================================
 * TYPES
 * =============================================
 */

export type DeviceRegisteredEvent = z.infer<typeof DeviceRegisteredEventSchema>;
export type DeviceBoundEvent = z.infer<typeof DeviceBoundEventSchema>;
export type DeviceUnboundEvent = z.infer<typeof DeviceUnboundEventSchema>;
export type DeviceConfigurationUpdatedEvent = z.infer<
  typeof DeviceConfigurationUpdatedEventSchema
>;
export type DeviceStatusChangedEvent = z.infer<
  typeof DeviceStatusChangedEventSchema
>;
export type DeviceDeletedEvent = z.infer<typeof DeviceDeletedEventSchema>;
export type DeviceTelemetryReceivedEvent = z.infer<
  typeof DeviceTelemetryReceivedEventSchema
>;
export type DeviceAlertRaisedEvent = z.infer<
  typeof DeviceAlertRaisedEventSchema
>;
export type DeviceAlertResolvedEvent = z.infer<
  typeof DeviceAlertResolvedEventSchema
>;

export type DeviceEvent = z.infer<typeof DeviceEventSchemas>;
