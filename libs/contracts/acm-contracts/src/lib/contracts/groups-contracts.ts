import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  GroupBaseSchema,
  CreateGroupSchema,
  UpdateGroupSchema,
  GroupMemberSchema,
  AddGroupMemberSchema,
  UpdateGroupMemberRoleSchema,
  GroupQuerySchema,
} from '../schemas/group-schemas.js';

const c = initContract();

/**
 * Groups API Contracts
 */
export const groupsContract = c.router({
  // Создание группы
  create: {
    method: 'POST',
    path: '/groups',
    summary: 'Создание новой группы',
    body: CreateGroupSchema,
    responses: {
      201: GroupBaseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
  },

  // Получение списка групп
  findAll: {
    method: 'GET',
    path: '/groups',
    summary: 'Получение списка групп',
    query: GroupQuerySchema,
    responses: {
      200: z.object({
        groups: z.array(GroupBaseSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    },
  },

  // Получение группы по ID
  findOne: {
    method: 'GET',
    path: '/groups/:id',
    summary: 'Получение группы по ID',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: GroupBaseSchema,
      404: z.object({ message: z.string() }),
    },
  },

  // Обновление группы
  update: {
    method: 'PATCH',
    path: '/groups/:id',
    summary: 'Обновление группы',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: UpdateGroupSchema,
    responses: {
      200: GroupBaseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
  },

  // Удаление группы
  remove: {
    method: 'DELETE',
    path: '/groups/:id',
    summary: 'Удаление группы',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      204: z.void(),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
  },

  // Получение участников группы
  getMembers: {
    method: 'GET',
    path: '/groups/:id/members',
    summary: 'Получение участников группы',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      page: z.number().min(1).default(1).optional(),
      limit: z.number().min(1).max(100).default(10).optional(),
      role: z.enum(['member', 'admin']).optional(),
    }),
    responses: {
      200: z.object({
        members: z.array(
          GroupMemberSchema.extend({
            user: z.object({
              id: z.string().uuid(),
              email: z.string().email(),
              name: z.string(),
            }),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
      404: z.object({ message: z.string() }),
    },
  },

  // Добавление участника в группу
  addMember: {
    method: 'POST',
    path: '/groups/:id/members',
    summary: 'Добавление участника в группу',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: AddGroupMemberSchema,
    responses: {
      201: GroupMemberSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
      409: z.object({ message: z.string() }), // Пользователь уже в группе
    },
  },

  // Обновление роли участника группы
  updateMemberRole: {
    method: 'PATCH',
    path: '/groups/:groupId/members/:userId',
    summary: 'Обновление роли участника группы',
    pathParams: z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
    body: UpdateGroupMemberRoleSchema,
    responses: {
      200: GroupMemberSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
  },

  // Удаление участника из группы
  removeMember: {
    method: 'DELETE',
    path: '/groups/:groupId/members/:userId',
    summary: 'Удаление участника из группы',
    pathParams: z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
    responses: {
      204: z.void(),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
  },
});
