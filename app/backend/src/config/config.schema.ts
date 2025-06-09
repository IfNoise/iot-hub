import { z } from 'zod';

// Расширенная схема конфигурации с environment-зависимыми значениями
export const envConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database Configuration
  DB_TYPE: z
    .enum(['postgres', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle'])
    .default('postgres'),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_PASSWORD: z.string().min(8).max(64),
  DATABASE_USER: z.string().min(3).max(32),
  DATABASE_NAME: z.string().min(1).max(64),

  // Database behavior (будет переопределяться в зависимости от среды)
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.string().default('false'), // 'true', 'false', 'error', 'warn'
  DB_DROP_SCHEMA: z.coerce.boolean().default(false),
  DB_SSL: z.coerce.boolean().default(false),
  DB_POOL_SIZE: z.coerce.number().default(10),

  // JWT Configuration
  JWT_SECRET: z.string().min(32).max(64),
  JWT_EXPIRATION: z.string().default('1h'),

  // Redis Configuration
  REDIS_URL: z.string().url().optional(),
  REDIS_ENABLED: z.coerce.boolean().default(true),
  REDIS_RETRY_ATTEMPTS: z.coerce.number().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().default(1000),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;
