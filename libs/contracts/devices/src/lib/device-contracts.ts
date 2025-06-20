import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  DeviceSchema,
  CreateDeviceSchema,
  DeviceQuerySchema,
  DevicesListResponseSchema,
  DeviceInternalStateSchema,
  UpdateDiscreteTimerSchema,
  UpdateAnalogTimerSchema,
  UpdateDiscreteRegulatorSchema,
  UpdateAnalogRegulatorSchema,
  UpdateIrrigatorSchema,
} from './device-schemas.js';

const c = initContract();

/**
 * REST API контракты для устройств
 */
export const devicesContract = c.router({
  // Получить список устройств
  getDevices: {
    method: 'GET',
    path: '/devices',
    query: DeviceQuerySchema,
    responses: {
      200: DevicesListResponseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить список устройств',
    description:
      'Возвращает список устройств с поддержкой пагинации и фильтрации',
  },

  // Получить устройство по ID
  getDevice: {
    method: 'GET',
    path: '/devices/:id',
    pathParams: z.object({
      id: z.string().describe('ID устройства'),
    }),
    responses: {
      200: DeviceSchema,
      404: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
    },
    summary: 'Получить устройство по ID',
    description:
      'Возвращает данные устройства по его уникальному идентификатору',
  },

  // Создать новое устройство
  createDevice: {
    method: 'POST',
    path: '/devices',
    body: CreateDeviceSchema,
    responses: {
      201: DeviceSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      409: z.object({ message: z.string() }),
    },
    summary: 'Создать новое устройство',
    description: 'Создает новое устройство в системе',
  },

  // Привязать устройство к пользователю
  bindDevice: {
    method: 'POST',
    path: '/devices/:id/bind',
    pathParams: z.object({
      id: z.string().describe('ID устройства'),
    }),
    body: z.object({
      ownerId: z.string().uuid().describe('ID владельца устройства'),
    }),
    responses: {
      200: DeviceSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Привязать устройство к пользователю',
    description: 'Привязывает устройство к конкретному пользователю',
  },

  // Отвязать устройство
  unbindDevice: {
    method: 'POST',
    path: '/devices/:id/unbind',
    pathParams: z.object({
      id: z.string().describe('ID устройства'),
    }),
    body: z.object({
      ownerId: z.string().uuid().describe('ID владельца устройства'),
    }),
    responses: {
      200: DeviceSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Отвязать устройство',
    description: 'Отвязывает устройство от пользователя',
  },

  // Удалить устройство
  deleteDevice: {
    method: 'DELETE',
    path: '/devices/:id',
    pathParams: z.object({
      id: z.string().describe('ID устройства'),
    }),
    responses: {
      204: z.void(),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Удалить устройство',
    description: 'Удаляет устройство из системы',
  },

  // Получить состояние устройства
  getDeviceState: {
    method: 'GET',
    path: '/devices/:id/state',
    pathParams: z.object({
      id: z.string().describe('ID устройства'),
    }),
    responses: {
      200: DeviceInternalStateSchema,
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Получить состояние устройства',
    description:
      'Возвращает внутреннее состояние устройства (таймеры, регуляторы, сенсоры и т.д.)',
  },

  // Получить список устройств текущего пользователя
  getMyDevices: {
    method: 'GET',
    path: '/devices/my',
    query: DeviceQuerySchema.omit({ ownerId: true }),
    responses: {
      200: DevicesListResponseSchema,
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
    },
    summary: 'Получить мои устройства',
    description: 'Возвращает список устройств текущего пользователя',
  },
});

/**
 * REST API контракты для управления компонентами устройств
 */
export const deviceComponentsContract = c.router({
  // Обновить дискретный таймер
  updateDiscreteTimer: {
    method: 'PATCH',
    path: '/devices/:deviceId/timers/discrete/:timerId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      timerId: z.string().describe('ID таймера'),
    }),
    body: UpdateDiscreteTimerSchema,
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Обновить дискретный таймер',
    description: 'Обновляет настройки дискретного таймера устройства',
  },

  // Обновить аналоговый таймер
  updateAnalogTimer: {
    method: 'PATCH',
    path: '/devices/:deviceId/timers/analog/:timerId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      timerId: z.string().describe('ID таймера'),
    }),
    body: UpdateAnalogTimerSchema,
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Обновить аналоговый таймер',
    description: 'Обновляет настройки аналогового таймера устройства',
  },

  // Обновить дискретный регулятор
  updateDiscreteRegulator: {
    method: 'PATCH',
    path: '/devices/:deviceId/regulators/discrete/:regulatorId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      regulatorId: z.string().describe('ID регулятора'),
    }),
    body: UpdateDiscreteRegulatorSchema,
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Обновить дискретный регулятор',
    description: 'Обновляет настройки дискретного регулятора устройства',
  },

  // Обновить аналоговый регулятор
  updateAnalogRegulator: {
    method: 'PATCH',
    path: '/devices/:deviceId/regulators/analog/:regulatorId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      regulatorId: z.string().describe('ID регулятора'),
    }),
    body: UpdateAnalogRegulatorSchema,
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Обновить аналоговый регулятор',
    description: 'Обновляет настройки аналогового регулятора устройства',
  },

  // Обновить ирригатор
  updateIrrigator: {
    method: 'PATCH',
    path: '/devices/:deviceId/irrigators/:irrigatorId',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      irrigatorId: z.string().describe('ID ирригатора'),
    }),
    body: UpdateIrrigatorSchema,
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Обновить ирригатор',
    description: 'Обновляет настройки ирригатора устройства',
  },

  // Запустить/остановить таймер
  toggleTimer: {
    method: 'POST',
    path: '/devices/:deviceId/timers/:timerId/toggle',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      timerId: z.string().describe('ID таймера'),
    }),
    body: z.object({
      action: z.enum(['start', 'stop']).describe('Действие с таймером'),
    }),
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Запустить/остановить таймер',
    description: 'Запускает или останавливает работу таймера',
  },

  // Запустить полив ирригатора
  startIrrigation: {
    method: 'POST',
    path: '/devices/:deviceId/irrigators/:irrigatorId/start',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      irrigatorId: z.string().describe('ID ирригатора'),
    }),
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Запустить полив',
    description: 'Запускает полив через ирригатор',
  },

  // Остановить полив ирригатора
  stopIrrigation: {
    method: 'POST',
    path: '/devices/:deviceId/irrigators/:irrigatorId/stop',
    pathParams: z.object({
      deviceId: z.string().describe('ID устройства'),
      irrigatorId: z.string().describe('ID ирригатора'),
    }),
    responses: {
      200: z.object({ success: z.boolean(), message: z.string() }),
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      403: z.object({ message: z.string() }),
      404: z.object({ message: z.string() }),
    },
    summary: 'Остановить полив',
    description: 'Останавливает полив через ирригатор',
  },
});

export type DevicesContract = typeof devicesContract;
export type DeviceComponentsContract = typeof deviceComponentsContract;
