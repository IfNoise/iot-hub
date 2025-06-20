import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Схема для информации о пользователе
 */
export const AuthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  role: z.string(),
  isEmailVerified: z.boolean(),
});

/**
 * Схема для расширенного профиля пользователя
 */
export const AuthProfileSchema = z.object({
  message: z.string(),
  data: z.record(z.any()), // Расширенная информация может быть любой
});

/**
 * Схема для админского ответа
 */
export const AdminResponseSchema = z.object({
  message: z.string(),
  admin: z.string(),
});

/**
 * Схема для пользовательского ответа
 */
export const UserResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    name: z.string(),
    role: z.string(),
  }),
});

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
