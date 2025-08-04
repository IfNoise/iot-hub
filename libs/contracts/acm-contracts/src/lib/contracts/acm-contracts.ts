import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserContextSchema,
  AccessCheckSchema,
  AccessResultSchema,
  KeycloakUserSyncSchema,
} from '../schemas/acm-schemas.js';

const c = initContract();

/**
 * ACM API Contracts
 */
export const acmContract = c.router({
  // Проверка прав доступа
  checkAccess: {
    method: 'POST',
    path: '/acm/access/check',
    summary: 'Проверка прав доступа',
    body: AccessCheckSchema,
    responses: {
      200: AccessResultSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
  },

  // Получение контекста пользователя
  getUserContext: {
    method: 'GET',
    path: '/acm/users/:userId/context',
    summary: 'Получение контекста пользователя',
    pathParams: z.object({
      userId: z.string().uuid(),
    }),
    responses: {
      200: UserContextSchema,
      404: z.object({ message: z.string() }),
    },
  },

  // Синхронизация пользователя с Keycloak
  syncUserFromKeycloak: {
    method: 'POST',
    path: '/acm/sync/user',
    summary: 'Синхронизация пользователя с Keycloak',
    body: KeycloakUserSyncSchema,
    responses: {
      200: z.object({
        message: z.string(),
        user: UserContextSchema,
      }),
      400: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },

  // Получение разрешений пользователя
  getUserPermissions: {
    method: 'GET',
    path: '/acm/users/:userId/permissions',
    summary: 'Получение разрешений пользователя',
    pathParams: z.object({
      userId: z.string().uuid(),
    }),
    query: z.object({
      organizationId: z.string().uuid().optional(),
      groupId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        permissions: z.array(z.string()),
        roles: z.array(z.string()),
      }),
      404: z.object({ message: z.string() }),
    },
  },

  // Проверка конкретного разрешения
  hasPermission: {
    method: 'POST',
    path: '/acm/users/:userId/has-permission',
    summary: 'Проверка наличия конкретного разрешения',
    pathParams: z.object({
      userId: z.string().uuid(),
    }),
    body: z.object({
      permission: z.string(),
      organizationId: z.string().uuid().optional(),
      groupId: z.string().uuid().optional(),
      resourceId: z.string().optional(),
    }),
    responses: {
      200: z.object({
        hasPermission: z.boolean(),
        reason: z.string().optional(),
      }),
      400: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
  },
});
