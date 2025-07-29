import { z } from 'zod';
import {
  BaseKafkaEventSchema,
  DeviceIdSchema,
  UserIdSchema,
} from '../shared/base-schemas.js';

/**
 * =============================================
 * MQTT INTEGRATION EVENTS
 * =============================================
 */

/**
 * Событие: MQTT сообщение получено от устройства
 */
export const MqttMessageReceivedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('mqtt.message.received'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    topic: z.string(),
    payload: z.union([z.string(), z.record(z.any())]),
    qos: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    retain: z.boolean(),
    receivedAt: z.string().datetime(),
    clientId: z.string(),
    username: z.string().optional(),
    ipAddress: z.string().optional(),
    messageSize: z.number(),
  }),
});

/**
 * Событие: MQTT сообщение отправлено устройству
 */
export const MqttMessageSentEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('mqtt.message.sent'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    topic: z.string(),
    payload: z.union([z.string(), z.record(z.any())]),
    qos: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    retain: z.boolean(),
    sentAt: z.string().datetime(),
    messageId: z.string().optional(),
    initiatedBy: UserIdSchema.optional(),
    deliveryStatus: z.enum(['pending', 'delivered', 'failed']).optional(),
  }),
});

/**
 * Событие: Устройство подключилось к MQTT
 */
export const MqttDeviceConnectedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('mqtt.device.connected'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    clientId: z.string(),
    connectedAt: z.string().datetime(),
    ipAddress: z.string().optional(),
    keepAlive: z.number().optional(),
    cleanSession: z.boolean().optional(),
    protocolVersion: z.enum(['3.1', '3.1.1', '5.0']),
    connectionInfo: z
      .object({
        username: z.string().optional(),
        willTopic: z.string().optional(),
        willPayload: z.string().optional(),
        certificateUsed: z.boolean(),
        certificateFingerprint: z.string().optional(),
      })
      .optional(),
  }),
});

/**
 * Событие: Устройство отключилось от MQTT
 */
export const MqttDeviceDisconnectedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('mqtt.device.disconnected'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    clientId: z.string(),
    disconnectedAt: z.string().datetime(),
    reason: z.enum([
      'client_initiated',
      'network_error',
      'protocol_error',
      'authentication_failed',
      'authorization_failed',
      'server_shutdown',
      'keep_alive_timeout',
      'session_expired',
    ]),
    lastWillExecuted: z.boolean().optional(),
    sessionDuration: z.number().optional(),
  }),
});

/**
 * Событие: Ошибка MQTT подключения
 */
export const MqttConnectionErrorEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('mqtt.connection.error'),
  payload: z.object({
    deviceId: DeviceIdSchema.optional(),
    clientId: z.string(),
    errorAt: z.string().datetime(),
    errorType: z.enum([
      'invalid_credentials',
      'certificate_validation_failed',
      'unauthorized_client',
      'malformed_packet',
      'quota_exceeded',
      'banned_client',
    ]),
    errorMessage: z.string(),
    ipAddress: z.string().optional(),
    attemptCount: z.number().default(1),
  }),
});

/**
 * =============================================
 * REST API INTEGRATION EVENTS
 * =============================================
 */

/**
 * Событие: REST API запрос выполнен
 */
export const RestApiRequestEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('rest.api.request'),
  payload: z.object({
    requestId: z.string(),
    userId: UserIdSchema.optional(),
    deviceId: DeviceIdSchema.optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string(),
    statusCode: z.number(),
    requestedAt: z.string().datetime(),
    responseTime: z.number(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    requestSize: z.number().optional(),
    responseSize: z.number().optional(),
    errorMessage: z.string().optional(),
  }),
});

/**
 * Событие: REST API ошибка аутентификации
 */
export const RestApiAuthErrorEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('rest.api.auth.error'),
  payload: z.object({
    requestId: z.string(),
    method: z.string(),
    path: z.string(),
    errorType: z.enum([
      'invalid_token',
      'expired_token',
      'missing_token',
      'insufficient_permissions',
      'account_disabled',
    ]),
    errorAt: z.string().datetime(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    attemptedUserId: UserIdSchema.optional(),
  }),
});

/**
 * =============================================
 * GATEWAY EVENTS
 * =============================================
 */

/**
 * Событие: Команда отправлена через gateway
 */
export const GatewayCommandSentEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('gateway.command.sent'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    commandType: z.string(),
    protocol: z.enum(['mqtt', 'coap', 'http', 'websocket']),
    sentAt: z.string().datetime(),
    requestedBy: UserIdSchema,
    gateway: z.enum(['mqtt-gateway', 'rest-gateway', 'websocket-gateway']),
    deliveryStatus: z.enum(['sent', 'delivered', 'failed', 'timeout']),
    retryCount: z.number().default(0),
  }),
});

/**
 * Событие: Ответ получен через gateway
 */
export const GatewayResponseReceivedEventSchema = BaseKafkaEventSchema.extend({
  eventType: z.literal('gateway.response.received'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    commandCorrelationId: z.string(),
    protocol: z.enum(['mqtt', 'coap', 'http', 'websocket']),
    receivedAt: z.string().datetime(),
    gateway: z.enum(['mqtt-gateway', 'rest-gateway', 'websocket-gateway']),
    responseTime: z.number(),
    success: z.boolean(),
    payload: z.record(z.any()).optional(),
    errorMessage: z.string().optional(),
  }),
});

/**
 * =============================================
 * UNION SCHEMAS
 * =============================================
 */

export const IntegrationEventSchemas = z.discriminatedUnion('eventType', [
  MqttMessageReceivedEventSchema,
  MqttMessageSentEventSchema,
  MqttDeviceConnectedEventSchema,
  MqttDeviceDisconnectedEventSchema,
  MqttConnectionErrorEventSchema,
  RestApiRequestEventSchema,
  RestApiAuthErrorEventSchema,
  GatewayCommandSentEventSchema,
  GatewayResponseReceivedEventSchema,
]);

/**
 * =============================================
 * TYPES
 * =============================================
 */

export type MqttMessageReceivedEvent = z.infer<
  typeof MqttMessageReceivedEventSchema
>;
export type MqttMessageSentEvent = z.infer<typeof MqttMessageSentEventSchema>;
export type MqttDeviceConnectedEvent = z.infer<
  typeof MqttDeviceConnectedEventSchema
>;
export type MqttDeviceDisconnectedEvent = z.infer<
  typeof MqttDeviceDisconnectedEventSchema
>;
export type MqttConnectionErrorEvent = z.infer<
  typeof MqttConnectionErrorEventSchema
>;
export type RestApiRequestEvent = z.infer<typeof RestApiRequestEventSchema>;
export type RestApiAuthErrorEvent = z.infer<typeof RestApiAuthErrorEventSchema>;
export type GatewayCommandSentEvent = z.infer<
  typeof GatewayCommandSentEventSchema
>;
export type GatewayResponseReceivedEvent = z.infer<
  typeof GatewayResponseReceivedEventSchema
>;

export type IntegrationEvent = z.infer<typeof IntegrationEventSchemas>;
