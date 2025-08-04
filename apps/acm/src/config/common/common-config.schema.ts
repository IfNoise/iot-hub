import { z } from 'zod';

export const commonConfigSchema = z.object({
  // Application
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3001),

  // Service Identity
  serviceName: z.string().default('user-management'),
  serviceVersion: z.string().default('1.0.0'),

  // CORS Configuration
  corsOrigin: z.string().default('*'),
  corsCredentials: z.coerce.boolean().default(true),

  // Security
  allowedOrigins: z.string().optional(),
  rateLimitWindowMs: z.coerce.number().default(900000), // 15 minutes
  rateLimitMax: z.coerce.number().default(100),

  // Redis Configuration
  redisUrl: z.string().url().optional(),
  redisEnabled: z.coerce.boolean().default(true),
  redisRetryAttempts: z.coerce.number().default(3),
  redisRetryDelay: z.coerce.number().default(1000),

  // Logging
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // File Logging Configuration
  logToFile: z.coerce.boolean().default(true).describe('Enable file logging'),
  logFilePath: z
    .string()
    .default('./logs/user-management.log')
    .describe('Path to log file'),
  logFileMaxSize: z
    .string()
    .default('10M')
    .describe('Maximum log file size before rotation'),
  logFileMaxFiles: z.coerce
    .number()
    .default(5)
    .describe('Maximum number of rotated log files'),

  // Logging Enhancement Options
  logFormat: z
    .enum(['json', 'pretty'])
    .default('json')
    .describe('Log output format'),
  logEnableMetadata: z.coerce
    .boolean()
    .default(true)
    .describe('Include metadata in logs (requestId, userId, etc.)'),
  logEnableRequestLogging: z.coerce
    .boolean()
    .default(true)
    .describe('Enable HTTP request/response logging'),

  // Development specific
  enableFileLoggingInDev: z.coerce
    .boolean()
    .default(false)
    .describe('Enable file logging in development mode'),

  // Loki Configuration
  lokiEnabled: z.coerce
    .boolean()
    .default(false)
    .describe('Enable Loki logging'),
  lokiUrl: z
    .string()
    .url()
    .optional()
    .describe('Loki server URL (e.g., http://localhost:3100)'),
  lokiLabels: z
    .string()
    .optional()
    .describe('Additional Loki labels as comma-separated key=value pairs'),
  lokiTimeout: z.coerce
    .number()
    .default(30000)
    .describe('Loki request timeout in milliseconds'),
  lokiSilenceErrors: z.coerce
    .boolean()
    .default(true)
    .describe('Silence Loki connection errors'),
});

export type CommonConfig = z.infer<typeof commonConfigSchema>;
