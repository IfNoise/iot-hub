import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  DeviceSchema,
  CreateDeviceSchema,
  BindDeviceSchema,
} from './device-schemas.js';

const c = initContract();

/**
 * Схема запроса списка устройств с пагинацией
 */
export const DeviceQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1).default(1))
    .optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1).max(100).default(10))
    .optional(),
});

/**
 * Схема ответа со списком устройств
 */
export const DevicesListResponseSchema = z.object({
  devices: z.array(DeviceSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/**
 * Схема для отвязки устройства
 */
export const UnbindDeviceSchema = z.object({
  id: z.string(),
});

/**
 * REST API контракты для устройств
 * Соответствуют реальным эндпоинтам в DevicesController
 */
export const devicesContract = c.router({
  // POST /devices/sign-device - Регистрация нового устройства
  registerDevice: {
    method: 'POST',
    path: '/devices/sign-device',
    body: CreateDeviceSchema,
    responses: {
      201: z.object({ message: z.string(), device: DeviceSchema }),
      400: z.object({ message: z.string() }),
    },
    summary: 'Регистрация нового устройства',
  },

  // POST /devices/bind-device - Привязка устройства к пользователю
  bindDevice: {
    method: 'POST',
    path: '/devices/bind-device',
    body: BindDeviceSchema,
    responses: {
      200: z.object({ message: z.string(), device: DeviceSchema }),
      404: z.object({ message: z.string() }),
      409: z.object({ message: z.string() }),
    },
    summary: 'Привязка устройства к пользователю',
  },

  // POST /devices/unbind-device - Отвязка устройства от пользователя
  unbindDevice: {
    method: 'POST',
    path: '/devices/unbind-device',
    body: UnbindDeviceSchema,
    responses: {
      200: z.object({ message: z.string(), device: DeviceSchema }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Отвязка устройства от пользователя',
  },

  // GET /devices - Получение списка устройств (с учетом прав доступа)
  getDevices: {
    method: 'GET',
    path: '/devices',
    query: DeviceQuerySchema,
    responses: {
      200: DevicesListResponseSchema,
      401: z.object({ message: z.string() }),
    },
    summary: 'Получение списка устройств',
    description:
      'Администраторы получают все устройства, обычные пользователи - только свои',
  },

  // GET /devices/admin/all - Получение всех устройств (только для администраторов)
  getAllDevicesAdmin: {
    method: 'GET',
    path: '/devices/admin/all',
    query: DeviceQuerySchema,
    responses: {
      200: DevicesListResponseSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получение всех устройств (только для администраторов)',
  },
});

export type DevicesContract = typeof devicesContract;
