import { z } from 'zod';

export const authConfigSchema = z.object({
  // JWT Configuration
  jwtSecret: z.string().min(32).max(64),
  jwtExpiration: z.string().default('1h'),

  // Keycloak Configuration (optional)
  keycloakEnabled: z.coerce.boolean().default(false),
  keycloakUrl: z.string().url().optional(),
  keycloakRealm: z.string().min(1).optional(),
  keycloakClientId: z.string().min(1).optional(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
