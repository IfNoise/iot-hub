import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AuthProfileSchema,
  AuthUserInfoSchema,
  AdminResponseSchema,
  UserResponseSchema,
} from './auth-schemas.js';

const c = initContract();

/**
 * REST API контракты для аутентификации
 * Соответствуют реальным эндпоинтам в AuthController
 */
export const authContract = c.router({
  // GET /auth/profile - Получить профиль текущего пользователя
  getProfile: {
    method: 'GET',
    path: '/auth/profile',
    responses: {
      200: AuthProfileSchema,
      401: z.object({ message: z.string() }),
    },
    summary: 'Получить профиль текущего пользователя',
  },

  // GET /auth/me - Получить базовую информацию о пользователе
  getUserInfo: {
    method: 'GET',
    path: '/auth/me',
    responses: {
      200: AuthUserInfoSchema,
      401: z.object({ message: z.string() }),
    },
    summary: 'Получить базовую информацию о пользователе',
  },

  // GET /auth/admin - Эндпоинт только для администраторов
  adminOnly: {
    method: 'GET',
    path: '/auth/admin',
    responses: {
      200: AdminResponseSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Эндпоинт только для администраторов',
  },

  // GET /auth/user - Эндпоинт для пользователей и администраторов
  userOrAdmin: {
    method: 'GET',
    path: '/auth/user',
    responses: {
      200: UserResponseSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Эндпоинт для пользователей и администраторов',
  },
});

export type AuthContract = typeof authContract;
