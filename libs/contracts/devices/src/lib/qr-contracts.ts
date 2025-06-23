import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  BindDeviceRequestSchema,
  GenerateDeviceQRSchema,
  GenerateDeviceQRResponseSchema,
  ValidationResultSchema,
} from './qr-schemas.js';

const c = initContract();

/**
 * ==============================================
 * ПРОИЗВОДСТВЕННЫЕ КОНТРАКТЫ
 * ==============================================
 */

/**
 * Контракты для производственного процесса
 * Используются при изготовлении устройств
 */
export const manufacturingContract = c.router({
  // POST /manufacturing/generate-device-qr - Генерация QR-кода для устройства
  generateDeviceQR: {
    method: 'POST',
    path: '/manufacturing/generate-device-qr',
    body: GenerateDeviceQRSchema,
    responses: {
      201: z.object({
        message: z.string(),
        data: GenerateDeviceQRResponseSchema,
      }),
      400: z.object({
        message: z.string(),
        errors: z.array(z.string()).optional(),
      }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Генерация QR-кода для нового устройства',
    description:
      'Создает устройство в системе и генерирует QR-код для привязки',
  },

  // GET /manufacturing/validate-token/:deviceId/:token - Валидация токена привязки
  validateBindingToken: {
    method: 'GET',
    path: '/manufacturing/validate-token/:deviceId/:token',
    pathParams: z.object({
      deviceId: z.string(),
      token: z.string(),
    }),
    responses: {
      200: ValidationResultSchema,
      404: z.object({ message: z.string() }),
    },
    summary: 'Валидация токена привязки устройства',
    description:
      'Проверяет валидность токена привязки и возможность привязки устройства',
  },
});

/**
 * ==============================================
 * ПОЛЬЗОВАТЕЛЬСКИЕ КОНТРАКТЫ
 * ==============================================
 */

/**
 * Схема ответа после успешной привязки
 */
export const BindDeviceResponseSchema = z.object({
  deviceId: z.string().describe('ID привязанного устройства'),
  userId: z.string().uuid().describe('ID владельца'),
  boundAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Время привязки'),
  status: z.literal('bound').describe('Статус устройства'),
});

/**
 * Схема для отвязки устройства
 */
export const UnbindDeviceRequestSchema = z.object({
  deviceId: z.string().describe('ID устройства для отвязки'),
  reason: z.string().optional().describe('Причина отвязки'),
});

/**
 * Схема списка устройств пользователя
 */
export const UserDevicesResponseSchema = z.object({
  devices: z.array(
    z.object({
      deviceId: z.string(),
      model: z.string().optional(),
      status: z.enum(['bound', 'suspended']),
      boundAt: z.preprocess((v) => new Date(v as string), z.date()),
      lastSeenAt: z
        .preprocess((v) => (v ? new Date(v as string) : null), z.date())
        .nullable(),
    })
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/**
 * Контракты для пользователей
 * Сканирование QR-кодов и управление устройствами
 */
export const userDevicesContract = c.router({
  // POST /devices/bind-qr - Привязка устройства через QR-код
  bindDeviceQR: {
    method: 'POST',
    path: '/devices/bind-qr',
    body: BindDeviceRequestSchema,
    responses: {
      200: z.object({
        message: z.string(),
        device: BindDeviceResponseSchema,
      }),
      400: z.object({
        message: z.string(),
        code: z.enum(['INVALID_QR', 'DEVICE_NOT_FOUND']).optional(),
      }),
      409: z.object({
        message: z.string(),
        code: z.literal('ALREADY_BOUND'),
      }),
      422: z.object({
        message: z.string(),
        code: z.literal('VALIDATION_FAILED'),
      }),
    },
    summary: 'Привязка устройства через сканирование QR-кода',
    description:
      'Привязывает устройство к пользователю используя данные из QR-кода',
  },

  // POST /devices/unbind - Отвязка устройства
  unbindDevice: {
    method: 'POST',
    path: '/devices/unbind',
    body: UnbindDeviceRequestSchema,
    responses: {
      200: z.object({
        message: z.string(),
        deviceId: z.string(),
      }),
      404: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Отвязка устройства от пользователя',
  },

  // GET /devices/my - Получение списка устройств пользователя
  getMyDevices: {
    method: 'GET',
    path: '/devices/my',
    query: z.object({
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(10).optional(),
      status: z.enum(['bound', 'suspended']).optional(),
    }),
    responses: {
      200: UserDevicesResponseSchema,
      401: z.object({ message: z.string() }),
    },
    summary: 'Получение списка устройств текущего пользователя',
  },

  // GET /devices/:deviceId/status - Получение статуса конкретного устройства
  getDeviceStatus: {
    method: 'GET',
    path: '/devices/:deviceId/status',
    pathParams: z.object({
      deviceId: z.string(),
    }),
    responses: {
      200: z.object({
        deviceId: z.string(),
        status: z.enum(['bound', 'suspended', 'unbound']),
        isOnline: z.boolean(),
        lastSeenAt: z
          .preprocess((v) => (v ? new Date(v as string) : null), z.date())
          .nullable(),
        ownedByCurrentUser: z.boolean(),
      }),
      404: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получение статуса устройства',
  },
});

/**
 * ==============================================
 * АДМИНИСТРАТИВНЫЕ КОНТРАКТЫ
 * ==============================================
 */

/**
 * Схема для административного управления устройствами
 */
export const AdminDeviceSchema = z.object({
  deviceId: z.string(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  status: z.enum(['manufactured', 'unbound', 'bound', 'suspended', 'revoked']),
  ownerId: z.string().uuid().nullable(),
  createdAt: z.preprocess((v) => new Date(v as string), z.date()),
  boundAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable(),
  lastSeenAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable(),
  bindingTokenExpiresAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable(),
});

/**
 * Контракты для администраторов
 */
export const adminDevicesContract = c.router({
  // GET /admin/devices - Получение всех устройств
  getAllDevices: {
    method: 'GET',
    path: '/admin/devices',
    query: z.object({
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
      status: z
        .enum(['manufactured', 'unbound', 'bound', 'suspended', 'revoked'])
        .optional(),
      model: z.string().optional(),
      ownerId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.object({
        devices: z.array(AdminDeviceSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получение всех устройств (только для администраторов)',
  },

  // PUT /admin/devices/:deviceId/status - Изменение статуса устройства
  updateDeviceStatus: {
    method: 'PUT',
    path: '/admin/devices/:deviceId/status',
    pathParams: z.object({
      deviceId: z.string(),
    }),
    body: z.object({
      status: z.enum(['suspended', 'revoked', 'unbound']),
      reason: z.string().optional(),
    }),
    responses: {
      200: z.object({
        message: z.string(),
        device: AdminDeviceSchema,
      }),
      404: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Изменение статуса устройства администратором',
  },
});

/**
 * ==============================================
 * ОСНОВНОЙ КОНТРАКТ
 * ==============================================
 */

/**
 * Объединенный контракт для всех операций с устройствами через QR-коды
 */
export const deviceQRContract = c.router({
  manufacturing: manufacturingContract,
  user: userDevicesContract,
  admin: adminDevicesContract,
});

export type DeviceQRContract = typeof deviceQRContract;
