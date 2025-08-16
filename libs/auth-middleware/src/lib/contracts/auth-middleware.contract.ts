import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AuthenticatedUserSchema,
  BaseUserSchema,
  ACMContextSchema,
  GetPermissionsRequestSchema,
  GetPermissionsResponseSchema,
} from '../schemas/index.js';

// Переиспользуем контракты из ACM
export { acmContract } from '@iot-hub/acm-contracts';

const c = initContract();

/**
 * Внутренний контракт для auth-middleware
 */
export const authMiddlewareContract = c.router({
  // Валидация JWT токена
  validateToken: {
    method: 'POST',
    path: '/auth/validate-token',
    body: z.object({
      token: z.string().describe('JWT токен'),
    }),
    responses: {
      200: BaseUserSchema,
      401: z.object({ 
        message: z.string(),
        error: z.string().optional(),
      }),
    },
    summary: 'Валидация JWT токена',
  },

  // Обогащение пользователя разрешениями
  enrichUserWithPermissions: {
    method: 'POST',
    path: '/auth/enrich-user',
    body: z.object({
      user: BaseUserSchema,
      context: ACMContextSchema.optional(),
    }),
    responses: {
      200: AuthenticatedUserSchema,
      400: z.object({ 
        message: z.string(),
        error: z.string().optional(),
      }),
    },
    summary: 'Обогащение пользователя разрешениями из ACM',
  },

  // Получение разрешений пользователя
  getUserPermissions: {
    method: 'POST',
    path: '/auth/permissions',
    body: GetPermissionsRequestSchema,
    responses: {
      200: GetPermissionsResponseSchema,
      400: z.object({ 
        message: z.string(),
        error: z.string().optional(),
      }),
      404: z.object({ 
        message: z.string(),
      }),
    },
    summary: 'Получение разрешений пользователя',
  },
});

export type AuthMiddlewareContract = typeof authMiddlewareContract;
