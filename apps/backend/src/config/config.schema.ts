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

  // Keycloak & OAuth2 Proxy Configuration
  KEYCLOAK_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .describe('Keycloak server URL'),
  KEYCLOAK_REALM: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak realm name'),
  KEYCLOAK_CLIENT_ID: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak client ID'),
  OAUTH2_PROXY_USER_HEADER: z
    .string()
    .default('X-Auth-Request-User')
    .describe('OAuth2 proxy user header'),
  OAUTH2_PROXY_EMAIL_HEADER: z
    .string()
    .default('X-Auth-Request-Email')
    .describe('OAuth2 proxy email header'),
  OAUTH2_PROXY_PREFERRED_USERNAME_HEADER: z
    .string()
    .default('X-Auth-Request-Preferred-Username')
    .describe('OAuth2 proxy preferred username header'),
  OAUTH2_PROXY_ACCESS_TOKEN_HEADER: z
    .string()
    .default('X-Auth-Request-Access-Token')
    .describe('OAuth2 proxy access token header'),

  // Development User Configuration (только для разработки когда Keycloak отключен)
  DEV_USER_ID: z
    .string()
    .default('dev-user-id')
    .describe('Development user ID'),
  DEV_USER_EMAIL: z
    .string()
    .email()
    .default('dev@example.com')
    .describe('Development user email'),
  DEV_USER_NAME: z
    .string()
    .default('Dev User')
    .describe('Development user name'),
  DEV_USER_ROLE: z
    .enum(['admin', 'user'])
    .default('admin')
    .describe('Development user role'),
  DEV_USER_AVATAR: z
    .string()
    .url()
    .optional()
    .describe('Development user avatar URL'),
  DEV_USER_EMAIL_VERIFIED: z.coerce
    .boolean()
    .default(true)
    .describe('Development user email verification status'),

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

  // File Logging Configuration
  LOG_TO_FILE: z.coerce.boolean().default(true).describe('Enable file logging'),
  LOG_FILE_PATH: z
    .string()
    .default('./logs/app.log')
    .describe('Path to log file'),
  LOG_FILE_MAX_SIZE: z
    .string()
    .default('10M')
    .describe('Maximum log file size before rotation'),
  LOG_FILE_MAX_FILES: z.coerce
    .number()
    .default(5)
    .describe('Maximum number of rotated log files'),

  // Logging Enhancement Options
  LOG_FORMAT: z
    .enum(['json', 'pretty'])
    .default('json')
    .describe('Log output format'),
  LOG_ENABLE_METADATA: z.coerce
    .boolean()
    .default(true)
    .describe('Include metadata in logs (requestId, userId, etc.)'),
  LOG_ENABLE_REQUEST_LOGGING: z.coerce
    .boolean()
    .default(true)
    .describe('Enable HTTP request/response logging'),

  // Development specific
  ENABLE_FILE_LOGGING_IN_DEV: z.coerce
    .boolean()
    .default(false)
    .describe('Enable file logging in development mode'),

  // MQTT Configuration
  MQTT_HOST: z.string().default('localhost').describe('MQTT broker host'),
  MQTT_PORT: z.coerce.number().default(1883).describe('MQTT broker port'),
  MQTT_SECURE_PORT: z.coerce
    .number()
    .default(8883)
    .describe('MQTT secure broker port for mTLS'),
  MQTT_USERNAME: z.string().optional().describe('MQTT broker username'),
  MQTT_PASSWORD: z.string().optional().describe('MQTT broker password'),
  MQTT_CLIENT_ID: z
    .string()
    .default('iot-hub-backend')
    .describe('MQTT client ID'),
  MQTT_KEEPALIVE: z.coerce
    .number()
    .default(60)
    .describe('MQTT keepalive interval'),
  MQTT_CLEAN_SESSION: z.coerce
    .boolean()
    .default(true)
    .describe('MQTT clean session'),
  MQTT_RECONNECT_PERIOD: z.coerce
    .number()
    .default(2000)
    .describe('MQTT reconnect period'),
  MQTT_CONNECT_TIMEOUT: z.coerce
    .number()
    .default(30000)
    .describe('MQTT connect timeout'),
  MQTT_QOS: z.coerce
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('MQTT QoS level'),
  MQTT_RETAIN: z.coerce
    .boolean()
    .default(false)
    .describe('MQTT retain messages'),
  MQTT_WILL_TOPIC: z.string().optional().describe('MQTT will topic'),
  MQTT_WILL_PAYLOAD: z.string().optional().describe('MQTT will payload'),
  MQTT_WILL_QOS: z.coerce
    .number()
    .min(0)
    .max(2)
    .default(0)
    .describe('MQTT will QoS'),
  MQTT_WILL_RETAIN: z.coerce
    .boolean()
    .default(false)
    .describe('MQTT will retain'),
  MQTT_MAX_RECONNECT_ATTEMPTS: z.coerce
    .number()
    .default(10)
    .describe('MQTT max reconnect attempts'),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;
