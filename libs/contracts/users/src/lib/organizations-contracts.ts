import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  OrganizationQuerySchema,
  GroupSchema,
  CreateGroupSchema,
  UpdateGroupSchema,
  GroupQuerySchema,
} from './organizations-schemas.js';

const c = initContract();

/**
 * Контракты для работы с организациями
 */
export const organizationsContract = c.router({
  // === ORGANIZATIONS ===

  /**
   * Создание новой организации
   */
  createOrganization: {
    method: 'POST',
    path: '/organizations',
    responses: {
      201: OrganizationSchema,
      400: z.object({
        error: z.string(),
        message: z.string(),
      }),
      409: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    body: CreateOrganizationSchema,
    summary: 'Создать новую организацию',
  },

  /**
   * Получение списка организаций
   */
  getOrganizations: {
    method: 'GET',
    path: '/organizations',
    responses: {
      200: z.object({
        organizations: z.array(OrganizationSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    },
    query: OrganizationQuerySchema,
    summary: 'Получить список организаций',
  },

  /**
   * Получение организации по ID
   */
  getOrganization: {
    method: 'GET',
    path: '/organizations/:id',
    responses: {
      200: OrganizationSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Получить организацию по ID',
  },

  /**
   * Обновление организации
   */
  updateOrganization: {
    method: 'PATCH',
    path: '/organizations/:id',
    responses: {
      200: OrganizationSchema,
      400: z.object({
        error: z.string(),
        message: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: UpdateOrganizationSchema,
    summary: 'Обновить организацию',
  },

  /**
   * Удаление организации
   */
  deleteOrganization: {
    method: 'DELETE',
    path: '/organizations/:id',
    responses: {
      204: z.undefined(),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Удалить организацию',
  },

  // === GROUPS ===

  /**
   * Создание новой группы
   */
  createGroup: {
    method: 'POST',
    path: '/organizations/:organizationId/groups',
    responses: {
      201: GroupSchema,
      400: z.object({
        error: z.string(),
        message: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      organizationId: z.string().uuid(),
    }),
    body: CreateGroupSchema.omit({ organizationId: true }),
    summary: 'Создать новую группу в организации',
  },

  /**
   * Получение списка групп организации
   */
  getGroups: {
    method: 'GET',
    path: '/organizations/:organizationId/groups',
    responses: {
      200: z.object({
        groups: z.array(GroupSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    },
    pathParams: z.object({
      organizationId: z.string().uuid(),
    }),
    query: GroupQuerySchema.omit({ organizationId: true }),
    summary: 'Получить список групп организации',
  },

  /**
   * Получение группы по ID
   */
  getGroup: {
    method: 'GET',
    path: '/groups/:id',
    responses: {
      200: GroupSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Получить группу по ID',
  },

  /**
   * Обновление группы
   */
  updateGroup: {
    method: 'PATCH',
    path: '/groups/:id',
    responses: {
      200: GroupSchema,
      400: z.object({
        error: z.string(),
        message: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: UpdateGroupSchema.omit({ organizationId: true }),
    summary: 'Обновить группу',
  },

  /**
   * Удаление группы
   */
  deleteGroup: {
    method: 'DELETE',
    path: '/groups/:id',
    responses: {
      204: z.undefined(),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Удалить группу',
  },

  /**
   * Получение устройств группы
   */
  getGroupDevices: {
    method: 'GET',
    path: '/groups/:id/devices',
    responses: {
      200: z.object({
        devices: z.array(
          z.object({
            deviceId: z.string(),
            model: z.string(),
            status: z.enum(['unbound', 'bound', 'revoked']),
            lastSeenAt: z.string(),
            boundAt: z.string().nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    summary: 'Получить список устройств группы',
  },

  /**
   * Получение пользователей группы
   */
  getGroupUsers: {
    method: 'GET',
    path: '/groups/:id/users',
    responses: {
      200: z.object({
        users: z.array(
          z.object({
            id: z.string().uuid(),
            email: z.string().email(),
            name: z.string(),
            role: z.enum(['admin', 'user', 'org_admin', 'group_admin']),
            createdAt: z.string(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    summary: 'Получить список пользователей группы',
  },
});

export type OrganizationsContract = typeof organizationsContract;
