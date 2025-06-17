import { z } from 'zod';

export const mqttConfigSchema = z.object({
  host: z.string().min(1, 'MQTT host is required'),
  port: z.coerce
    .number()
    .int()
    .min(1, 'MQTT port must be a positive integer')
    .default(1883),
  username: z.string().optional(),
  password: z.string().optional(),
  clientId: z
    .string()
    .min(1, 'MQTT client ID is required')
    .default('mqtt_client'),
  keepalive: z.coerce
    .number()
    .int()
    .min(1, 'Keepalive must be a positive integer')
    .default(60),
  clean: z.coerce.boolean().default(true),
  protocolVersion: z.coerce
    .number()
    .int()
    .min(3, 'Protocol version must be at least 3')
    .default(4),
  reconnectPeriod: z.coerce
    .number()
    .int()
    .min(0, 'Reconnect period must be a non-negative integer')
    .default(1000),
  connectTimeout: z.coerce
    .number()
    .int()
    .min(0, 'Connect timeout must be a non-negative integer')
    .default(30_000),
  rejectUnauthorized: z.coerce.boolean().default(true),
  tls: z
    .object({
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
      passphrase: z.string().optional(),
    })
    .optional(),
  will: z
    .object({
      topic: z.string().min(1, 'Will topic is required'),
      payload: z.string().optional(),
      qos: z.coerce
        .number()
        .int()
        .min(0, 'QoS must be 0, 1, or 2')
        .max(2, 'QoS must be 0, 1, or 2')
        .default(0),
      retain: z.coerce.boolean().default(false),
    })
    .optional(),
  protocolId: z.string().default('MQTT'),
  reconnect: z.coerce.boolean().default(true),
  maxReconnectAttempts: z.coerce
    .number()
    .int()
    .min(0, 'Max reconnect attempts must be a non-negative integer')
    .default(10),
  cleanSession: z.coerce.boolean().default(true),
  mqttVersion: z.coerce
    .number()
    .int()
    .min(3, 'MQTT version must be at least 3')
    .default(4),
});
export type MqttConfig = z.infer<typeof mqttConfigSchema>;
export const mqttConfigDefault: MqttConfig = mqttConfigSchema.parse({
  host: 'localhost',
  port: 1883,
  username: undefined,
  password: undefined,
  clientId: 'mqtt_client',
  keepalive: 60,
  clean: true,
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30_000,
  rejectUnauthorized: true,
  tls: undefined,
  will: {
    topic: 'will',
    payload: undefined,
    qos: 0,
    retain: false,
  },
  protocolId: 'MQTT',
  reconnect: true,
  maxReconnectAttempts: 10,
  cleanSession: true,
  mqttVersion: 4,
});
export const mqttConfigSchemaWithDefaults = mqttConfigSchema.merge(
  z.object({
    host: z.string().default(mqttConfigDefault.host),
    port: z.coerce.number().int().default(mqttConfigDefault.port),
    username: z.string().optional(),
    password: z.string().optional(),
    clientId: z.string().default(mqttConfigDefault.clientId),
    keepalive: z.coerce.number().int().default(mqttConfigDefault.keepalive),
    clean: z.coerce.boolean().default(mqttConfigDefault.clean),
    protocolVersion: z.coerce
      .number()
      .int()
      .default(mqttConfigDefault.protocolVersion),
    reconnectPeriod: z.coerce
      .number()
      .int()
      .default(mqttConfigDefault.reconnectPeriod),
    connectTimeout: z.coerce
      .number()
      .int()
      .default(mqttConfigDefault.connectTimeout),
    rejectUnauthorized: z.coerce
      .boolean()
      .default(mqttConfigDefault.rejectUnauthorized),
    tls: z
      .object({
        ca: z.string().optional(),
        cert: z.string().optional(),
        key: z.string().optional(),
        passphrase: z.string().optional(),
      })
      .optional(),
    will: z
      .object({
        topic: z
          .string()
          .min(1, 'Will topic is required')
          .default(mqttConfigDefault.will.topic),
        payload: z.string().optional(),
        qos: z.coerce
          .number()
          .int()
          .min(0, 'QoS must be 0, 1, or 2')
          .max(2, 'QoS must be 0, 1, or 2')
          .default(mqttConfigDefault.will.qos),
        retain: z.coerce.boolean().default(mqttConfigDefault.will.retain),
      })
      .optional(),
    protocolId: z.string().default(mqttConfigDefault.protocolId),
    reconnect: z.coerce.boolean().default(mqttConfigDefault.reconnect),
    maxReconnectAttempts: z.coerce
      .number()
      .int()
      .min(0, 'Max reconnect attempts must be a non-negative integer')
      .default(mqttConfigDefault.maxReconnectAttempts),
    cleanSession: z.coerce.boolean().default(mqttConfigDefault.cleanSession),
    mqttVersion: z.coerce
      .number()
      .int()
      .min(3, 'MQTT version must be at least 3')
      .default(mqttConfigDefault.mqttVersion),
  })
);
