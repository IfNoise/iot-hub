import { z } from 'zod';

/**
 * Logging configuration schema for microservices
 * Поддерживает множественное логирование: консоль + файлы + Loki
 */
export const loggingConfigSchema = z.object({
  // Basic Logging Configuration
  logLevel: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info')
    .describe('Logging level'),

  // File Logging Configuration
  logToFile: z.coerce.boolean().default(true).describe('Enable file logging'),

  logFilePath: z
    .string()
    .default('./logs/app.log')
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

  // Loki Configuration (Centralized Logging)
  lokiEnabled: z.coerce
    .boolean()
    .default(false)
    .describe('Enable Loki centralized logging'),

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
    .describe('Silence Loki errors to prevent app crashes'),

  // Advanced Loki Configuration
  lokiUsername: z.string().optional().describe('Loki authentication username'),

  lokiPassword: z.string().optional().describe('Loki authentication password'),
});

export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
