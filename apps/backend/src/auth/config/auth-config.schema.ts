import { z } from 'zod';

export const authConfigSchema = z.object({
  // JWT Configuration
  jwtSecret: z.string().min(32).max(64),
  jwtExpiration: z.string().default('1h'),
  frontEndUrl: z.string().url().describe('URL of the frontend application'),

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
  keycloakClientSecret: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak client secret'),
  keycloakAdminUsername: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak admin username'),
  keycloakAdminPassword: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .describe('Keycloak admin password'),

  // Development User Configuration (только для разработки когда Keycloak отключен)
  devUserId: z
    .string()
    .default('550e8400-e29b-41d4-a716-446655440000')
    .describe('Development user ID (должен быть валидный UUID)'),
  devUserEmail: z
    .string()
    .email()
    .default('dev@example.com')
    .describe('Development user email'),
  devUserName: z.string().default('Dev User').describe('Development user name'),
  devUserRole: z
    .enum([
      'admin',
      'personal-user',
      'organization-user',
      'group-user',
      'organization-admin',
      'group-admin',
      'organization-owner',
    ])
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
