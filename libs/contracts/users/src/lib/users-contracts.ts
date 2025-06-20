import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserBaseSchema,
  CreateUserSchema,
  UpdateUserSchema,
} from './users-schemas.js';

const c = initContract();

/**
 * REST API контракты для пользователей
 * Соответствуют реальным эндпоинтам в UsersController
 */
export const usersContract = c.router({
  // GET /users - Получить всех пользователей
  getUsers: {
    method: 'GET',
    path: '/users',
    responses: {
      200: z.array(UserBaseSchema),
      401: z.object({ message: z.string() }),
    },
    summary: 'Получить всех пользователей',
  },

  // GET /users/:id - Получить пользователя по ID
  getUser: {
    method: 'GET',
    path: '/users/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: UserBaseSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Получить пользователя по ID',
  },

  // POST /users - Создать нового пользователя
  createUser: {
    method: 'POST',
    path: '/users',
    body: CreateUserSchema,
    responses: {
      201: UserBaseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Создать нового пользователя',
  },

  // PATCH /users/:id - Обновить пользователя
  updateUser: {
    method: 'PATCH',
    path: '/users/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: UpdateUserSchema,
    responses: {
      200: UserBaseSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Обновить данные пользователя',
  },

  // DELETE /users/:id - Удалить пользователя
  deleteUser: {
    method: 'DELETE',
    path: '/users/:id',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      204: z.void(),
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Удалить пользователя',
  },

  // PATCH /users/:id/balance - Обновить баланс пользователя
  updateBalance: {
    method: 'PATCH',
    path: '/users/:id/balance',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      amount: z.number(),
    }),
    responses: {
      200: UserBaseSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Обновить баланс пользователя',
  },

  // PATCH /users/:id/plan - Обновить план пользователя
  updatePlan: {
    method: 'PATCH',
    path: '/users/:id/plan',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      plan: z.enum(['free', 'pro']),
      expiresAt: z.date().optional(),
    }),
    responses: {
      200: UserBaseSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Обновить план пользователя',
  },
});

export type UsersContract = typeof usersContract;
