import { z } from 'zod';

export const kafkaConfigSchema = z.object({
  // Kafka Core
  enabled: z.coerce.boolean().default(true),
  brokers: z.string().default('localhost:9093'),
  clientId: z.string().default('acm'),
  groupId: z.string().default('acm-group'),

  // Connection Options
  connectionTimeout: z.coerce.number().default(3000),
  requestTimeout: z.coerce.number().default(30000),
  retry: z
    .object({
      initialRetryTime: z.coerce.number().default(100),
      retries: z.coerce.number().default(8),
    })
    .default({
      initialRetryTime: 100,
      retries: 8,
    }),

  // Security (если используется)
  ssl: z.coerce.boolean().default(false),
  sasl: z
    .object({
      mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),

  // Consumer Options
  consumer: z
    .object({
      sessionTimeout: z.coerce.number().default(30000),
      rebalanceTimeout: z.coerce.number().default(60000),
      heartbeatInterval: z.coerce.number().default(3000),
      maxBytesPerPartition: z.coerce.number().default(1048576),
      minBytes: z.coerce.number().default(1),
      maxBytes: z.coerce.number().default(10485760),
      maxWaitTimeInMs: z.coerce.number().default(5000),
    })
    .default({
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      minBytes: 1,
      maxBytes: 10485760,
      maxWaitTimeInMs: 5000,
    }),

  // Producer Options
  producer: z
    .object({
      maxInFlightRequests: z.coerce.number().default(1),
      idempotent: z.coerce.boolean().default(false),
      transactionTimeout: z.coerce.number().default(30000),
    })
    .default({
      maxInFlightRequests: 1,
      idempotent: false,
      transactionTimeout: 30000,
    }),
});

export type KafkaConfig = z.infer<typeof kafkaConfigSchema>;
