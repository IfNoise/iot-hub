import { z } from 'zod';

export const mqttConfigSchema = z.object({
  brokerUrl: z.string().url('MQTT broker URL must be a valid URL').default('mqtt://localhost:1883'),
  host: z.string().min(1, 'MQTT host is required').default('localhost'),
  port: z.coerce
    .number()
    .int()
    .min(1, 'MQTT port must be a positive integer')
    .default(1883),
  securePort: z.coerce
    .number()
    .int()
    .min(1, 'MQTT secure port must be a positive integer')
    .default(8883),
  username: z.string().optional(),
  password: z.string().optional(),
  clientId: z
    .string()
    .min(1, 'MQTT client ID is required')
    .default('iot-hub-backend'),
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
    .default(2000),
  connectTimeout: z.coerce
    .number()
    .int()
    .min(0, 'Connect timeout must be a non-negative integer')
    .default(30_000),
  rejectUnauthorized: z.coerce.boolean().default(true),
  qos: z.coerce
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('MQTT QoS level'),
  retain: z.coerce
    .boolean()
    .default(false)
    .describe('MQTT retain messages'),
  maxReconnectAttempts: z.coerce
    .number()
    .default(10)
    .describe('MQTT max reconnect attempts'),
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
  cleanSession: z.coerce.boolean().default(true),
  mqttVersion: z.coerce
    .number()
    .int()
    .min(3, 'MQTT version must be at least 3')
    .default(4),
});

export type MqttConfig = z.infer<typeof mqttConfigSchema>;
