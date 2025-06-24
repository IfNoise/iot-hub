import { z } from 'zod';

export const authConfigSchema = z.object({
  // JWT Configuration
  jwtSecret: z.string().min(32).max(64),
  jwtExpiration: z.string().default('1h'),

  // Keycloak & OAuth2 Proxy Configuration
  keycloakUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .describe('Keycloak server URL'),
  keycloakRealm: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak realm name'),
  keycloakClientId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak client ID'),
  oauth2ProxyUserHeader: z
    .string()
    .default('X-Auth-Request-User')
    .describe('OAuth2 proxy user header'),
  oauth2ProxyEmailHeader: z
    .string()
    .default('X-Auth-Request-Email')
    .describe('OAuth2 proxy email header'),
  oauth2ProxyPreferredUsernameHeader: z
    .string()
    .default('X-Auth-Request-Preferred-Username')
    .describe('OAuth2 proxy preferred username header'),
  oauth2ProxyAccessTokenHeader: z
    .string()
    .default('X-Auth-Request-Access-Token')
    .describe('OAuth2 proxy access token header'),

  // Development User Configuration (только для разработки когда Keycloak отключен)
  devUserId: z
    .string()
    .default('dev-user-id')
    .describe('Development user ID'),
  devUserEmail: z
    .string()
    .email()
    .default('dev@example.com')
    .describe('Development user email'),
  devUserName: z
    .string()
    .default('Dev User')
    .describe('Development user name'),
  devUserRole: z
    .enum(['admin', 'user'])
    .default('admin')
    .describe('Development user role'),
  devUserAvatar: z
    .string()
    .url()
    .optional()
    .describe('Development user avatar URL'),
  devUserEmailVerified: z.coerce
    .boolean()
    .default(true)
    .describe('Development user email verification status'),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
