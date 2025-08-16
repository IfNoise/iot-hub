import { z } from 'zod';
import { AuthenticatedUserSchema } from './jwt.schemas.js';

/**
 * Схема конфигурации auth-middleware
 */
export const AuthMiddlewareConfigSchema = z.object({
  jwt: z.object({
    issuer: z.string().url().describe('JWT issuer URL'),
    audience: z.string().optional().describe('JWT audience'),
    jwksUri: z.string().url().describe('JWKS endpoint URL'),
  }),
  acm: z.object({
    baseUrl: z.string().url().describe('ACM service base URL'),
    timeout: z.number().positive().default(5000).describe('Request timeout in ms'),
    retryAttempts: z.number().min(1).max(5).default(3).describe('Retry attempts'),
  }),
  cache: z
    .object({
      enabled: z.boolean().default(true).describe('Enable permissions caching'),
      ttl: z.number().positive().default(300).describe('Cache TTL in seconds (default: 5 minutes)'),
    })
    .optional(),
  development: z
    .object({
      enabled: z.boolean().default(false).describe('Enable development mode'),
      mockUser: AuthenticatedUserSchema.describe('Mock user for development'),
    })
    .optional(),
});

/**
 * Типы TypeScript
 */
export type AuthMiddlewareConfig = z.infer<typeof AuthMiddlewareConfigSchema>;
