import { z } from 'zod';

export const devicesConfigSchema = z.object({
  // Device-specific settings can be added here as they are identified
  // For now, this is a placeholder for future device-related configurations

  // Device management settings
  deviceTimeoutMs: z.coerce
    .number()
    .min(1000)
    .default(30000)
    .describe('Device connection timeout in milliseconds'),

  deviceHeartbeatIntervalMs: z.coerce
    .number()
    .min(1000)
    .default(10000)
    .describe('Device heartbeat interval in milliseconds'),

  maxDevicesPerUser: z.coerce
    .number()
    .min(1)
    .default(100)
    .describe('Maximum devices per user'),

  // Certificate management
  certificateValidityDays: z.coerce
    .number()
    .min(1)
    .default(365)
    .describe('Certificate validity period in days'),

  // Device data retention
  deviceDataRetentionDays: z.coerce
    .number()
    .min(1)
    .default(30)
    .describe('Device data retention period in days'),

  // Broker settings for certificate generation
  brokerHost: z
    .string()
    .default('localhost')
    .describe('MQTT broker host for certificate generation'),

  brokerSecurePort: z.coerce
    .number()
    .min(1)
    .max(65535)
    .default(8883)
    .describe('MQTT broker secure port for mTLS connections'),
});

export type DevicesConfig = z.infer<typeof devicesConfigSchema>;
