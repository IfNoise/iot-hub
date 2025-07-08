import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  BindDeviceResponseSchema,
  UnbindDeviceRequestSchema,
  UserDevicesResponseSchema,
  AdminDeviceSchema,
} from './device-schemas.js';
import {
  BindDeviceRequestSchema,
  GenerateDeviceQRSchema,
  GenerateDeviceQRResponseSchema,
  ValidationResultSchema,
} from './qr-schemas.js';

const c = initContract();

/**
 * ==============================================
 * DEVICE CONTRACTS
 * ==============================================
 *
 * Контракты для работы с устройствами в IoT Hub.
 *
 * ВАЖНЫЕ ПРИНЦИПЫ:
 *
 * 1. ИЗВЛЕЧЕНИЕ USERID ЧЕРЕЗ MIDDLEWARE:
 *    - Все пользовательские эндпоинты извлекают userId из JWT токена
 *    - userId НЕ передается в теле запроса
 *    - Используется декоратор @CurrentUser() в контроллерах
 *    - Метаданные: requiresAuth: true, userIdFromToken: true
 *
 * 2. БЕССРОЧНЫЕ ТОКЕНЫ ПРИВЯЗКИ:
 *    - Токены привязки устройств не имеют срока действия
 *    - Убраны поля: exp, tokenExpirationDays, tokenExpiresAt
 *    - Токены действуют до момента привязки устройства
 *
 * 3. УНИФИЦИРОВАННЫЕ СХЕМЫ:
 *    - Все схемы устройств и QR в device-schemas.ts
 *    - Избегаем дублирования схем между модулями
 *    - Переиспользуем существующие схемы
 */

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
 * Контракты для пользователей
 * Сканирование QR-кодов и управление устройствами
 *
 * ⚠️ ТРЕБУЕТ АУТЕНТИФИКАЦИИ:
 * - Все эндпоинты требуют Bearer token
 * - userId извлекается из JWT токена через middleware
 * - Используется @CurrentUser() декоратор в контроллере
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
      401: z.object({
        message: z.string(),
        code: z.literal('UNAUTHORIZED').optional(),
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
      'Привязывает устройство к аутентифицированному пользователю используя данные из QR-кода. ' +
      'userId извлекается из JWT токена.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
    } as const,
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
    description:
      'Отвязывает устройство от аутентифицированного пользователя. ' +
      'Проверяется, что пользователь является владельцем устройства. ' +
      'userId извлекается из JWT токена.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
    } as const,
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
    description:
      'Возвращает список устройств, принадлежащих аутентифицированному пользователю. ' +
      'userId извлекается из JWT токена.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
    } as const,
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
    description:
      'Возвращает статус устройства и информацию о том, принадлежит ли оно текущему пользователю. ' +
      'userId извлекается из JWT токена.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
    } as const,
  },
});

/**
 * ==============================================
 * АДМИНИСТРАТИВНЫЕ КОНТРАКТЫ
 * ==============================================
 */

/**
 * Контракты для администраторов
 */
export const adminDevicesContract = c.router({
  // GET /admin/devices - Получение всех устройств (заменяет старый getAllDevicesAdmin)
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
 * ENTERPRISE КОНТРАКТЫ
 * ==============================================
 */

/**
 * Контракты для работы с устройствами в рамках организаций и групп
 */
export const enterpriseDevicesContract = c.router({
  // POST /devices/bind-to-group - Привязка устройства к группе
  bindDeviceToGroup: {
    method: 'POST',
    path: '/devices/bind-to-group',
    body: z.object({
      deviceId: z.string(),
      groupId: z.string().uuid(),
    }),
    responses: {
      200: z.object({
        message: z.string(),
        device: BindDeviceResponseSchema,
      }),
      400: z.object({
        message: z.string(),
        code: z.enum(['INVALID_GROUP', 'DEVICE_NOT_FOUND']).optional(),
      }),
      401: z.object({
        message: z.string(),
        code: z.literal('UNAUTHORIZED').optional(),
      }),
      403: z.object({
        message: z.string(),
        code: z.literal('FORBIDDEN'),
      }),
      409: z.object({
        message: z.string(),
        code: z.literal('ALREADY_BOUND'),
      }),
    },
    summary: 'Привязка устройства к группе',
    description:
      'Привязывает устройство к группе организации. Требует права администратора группы или организации.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
      requiresRole: ['org_admin', 'group_admin'],
    } as const,
  },

  // POST /devices/transfer-to-group - Перенос устройства в группу
  transferDeviceToGroup: {
    method: 'POST',
    path: '/devices/transfer-to-group',
    body: z.object({
      deviceId: z.string(),
      fromGroupId: z.string().uuid().optional(),
      toGroupId: z.string().uuid(),
    }),
    responses: {
      200: z.object({
        message: z.string(),
        device: BindDeviceResponseSchema,
      }),
      400: z.object({
        message: z.string(),
        code: z.enum(['INVALID_GROUP', 'DEVICE_NOT_FOUND']).optional(),
      }),
      401: z.object({
        message: z.string(),
        code: z.literal('UNAUTHORIZED').optional(),
      }),
      403: z.object({
        message: z.string(),
        code: z.literal('FORBIDDEN'),
      }),
    },
    summary: 'Перенос устройства между группами',
    description:
      'Переносит устройство из одной группы в другую в рамках организации.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
      requiresRole: ['org_admin', 'group_admin'],
    } as const,
  },

  // GET /organizations/:orgId/devices - Получение устройств организации
  getOrganizationDevices: {
    method: 'GET',
    path: '/organizations/:orgId/devices',
    pathParams: z.object({
      orgId: z.string().uuid(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      groupId: z.string().uuid().optional(),
      status: z.enum(['unbound', 'bound', 'revoked']).optional(),
      model: z.string().optional(),
    }),
    responses: {
      200: z.object({
        devices: z.array(
          z.object({
            deviceId: z.string(),
            model: z.string(),
            status: z.enum(['unbound', 'bound', 'revoked']),
            ownerType: z.enum(['user', 'group']),
            ownerId: z.string().uuid().nullable(),
            organizationId: z.string().uuid().nullable(),
            groupId: z.string().uuid().nullable(),
            lastSeenAt: z.string(),
            boundAt: z.string().nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
      401: z.object({
        message: z.string(),
        code: z.literal('UNAUTHORIZED').optional(),
      }),
      403: z.object({
        message: z.string(),
        code: z.literal('FORBIDDEN'),
      }),
    },
    summary: 'Получение списка устройств организации',
    description:
      'Возвращает список всех устройств организации с возможностью фильтрации по группе.',
    metadata: {
      requiresAuth: true,
      userIdFromToken: true,
      requiresRole: ['org_admin', 'group_admin'],
    } as const,
  },
});

/**
 * ==============================================
 * ОСНОВНОЙ КОНТРАКТ
 * ==============================================
 */

/**
 * Объединенный контракт для всех операций с устройствами
 * Включает и QR-функционал и традиционный API
 */
export const devicesContract = c.router({
  manufacturing: manufacturingContract,
  user: userDevicesContract,
  admin: adminDevicesContract,
  enterprise: enterpriseDevicesContract,
});

export type DevicesContract = typeof devicesContract;
