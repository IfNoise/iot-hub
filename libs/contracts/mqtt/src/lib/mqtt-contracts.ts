import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Базовая схема для команды устройству
 */
export const BaseDeviceCommandSchema = z.object({
  userId: z.string().min(1).max(255),
  deviceId: z.string().min(1).max(255),
  timeout: z.number().int().min(1000).max(30000).default(5000),
});

/**
 * Схема для команды устройству с ожиданием ответа
 */
export const DeviceCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.enum([
    'getDeviceState',
    'getSensors',
    'reboot',
    'updateDiscreteTimer',
    'updateAnalogTimer',
    'updateDiscreteRegulator',
    'updateAnalogRegulator',
    'updateIrrigator',
  ]),
  params: z.record(z.any()).optional(),
});

/**
 * Схема для команды устройству без ожидания ответа
 */
export const DeviceCommandNoResponseSchema = BaseDeviceCommandSchema.omit({
  timeout: true,
}).extend({
  method: z.enum([
    'getDeviceState',
    'getSensors',
    'reboot',
    'updateDiscreteTimer',
    'updateAnalogTimer',
    'updateDiscreteRegulator',
    'updateAnalogRegulator',
    'updateIrrigator',
  ]),
  params: z.record(z.any()).optional(),
});

/**
 * Схема ответа от устройства
 */
export const DeviceCommandResponseSchema = z.object({
  id: z.string(),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
    })
    .optional(),
  metadata: z.object({
    executionTime: z.number(),
    sentAt: z.string(),
    receivedAt: z.string(),
  }),
});

/**
 * Схема ответа для команды без ожидания
 */
export const DeviceCommandNoResponseResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  metadata: z.object({
    sentAt: z.string(),
  }),
});

/**
 * REST API контракты для MQTT RPC
 * Соответствуют реальным эндпоинтам в MqttRpcController
 */
export const mqttContract = c.router({
  // POST /mqtt/device/command - Отправить команду устройству с ожиданием ответа
  sendDeviceCommand: {
    method: 'POST',
    path: '/mqtt/device/command',
    body: DeviceCommandSchema,
    responses: {
      200: DeviceCommandResponseSchema,
      400: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
      }),
      408: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
        details: z.object({
          executionTime: z.number(),
          sentAt: z.string(),
          originalError: z.string(),
        }),
      }),
      500: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
        details: z.object({
          executionTime: z.number(),
          sentAt: z.string(),
          originalError: z.string(),
        }),
      }),
      503: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
        details: z.object({
          executionTime: z.number(),
          sentAt: z.string(),
          originalError: z.string(),
        }),
      }),
    },
    summary: 'Отправить команду устройству с ожиданием ответа',
    description:
      'Отправляет RPC команду IoT устройству через MQTT брокер и ожидает ответ',
  },

  // POST /mqtt/device/command/no-response - Отправить команду устройству без ожидания ответа
  sendDeviceCommandNoResponse: {
    method: 'POST',
    path: '/mqtt/device/command/no-response',
    body: DeviceCommandNoResponseSchema,
    responses: {
      200: DeviceCommandNoResponseResultSchema,
      400: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
      }),
      500: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
      }),
      503: z.object({
        statusCode: z.number(),
        message: z.string(),
        error: z.string(),
      }),
    },
    summary: 'Отправить команду устройству без ожидания ответа',
    description:
      'Отправляет RPC команду IoT устройству через MQTT брокер без ожидания ответа',
  },
});

export type MqttContract = typeof mqttContract;
