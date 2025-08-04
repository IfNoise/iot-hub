import { z } from 'zod';

export const authConfigSchema = z.object({
  // JWT Configuration
  jwtSecret: z.string().min(32).max(64),
  jwtExpiration: z.string().default('1h'),

  // Keycloak Configuration
  keycloak: z
    .object({
      enabled: z.coerce.boolean().default(false),
      baseUrl: z.string().url().default('http://localhost:8080'),
      realm: z.string().min(1).default('iot-hub'),
      timeout: z.number().positive().default(10000),

      // Service Account для Admin API
      serviceAccount: z.object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
      }),

      // Client ID для фронтенда (если нужен)
      publicClient: z
        .object({
          clientId: z.string().min(1).default('iot-hub-frontend'),
        })
        .optional(),
    })
    .optional(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
