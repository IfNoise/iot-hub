import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Схема для основного ответа приложения
 */
export const AppDataSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  version: z.string().optional(),
});

/**
 * Схема для ответа тестирования логирования
 */
export const LoggingTestSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  logLevels: z.array(z.string()),
});

/**
 * REST API контракты для основного приложения
 */
export const appContract = c.router({
  // GET / - Получить основную информацию приложения
  getData: {
    method: 'GET',
    path: '/',
    responses: {
      200: AppDataSchema,
    },
    summary: 'Получить основную информацию приложения',
  },

  // GET /test-logging - Протестировать систему логирования
  testLogging: {
    method: 'GET',
    path: '/test-logging',
    responses: {
      200: LoggingTestSchema,
    },
    summary: 'Протестировать систему логирования',
  },
});

export type AppContract = typeof appContract;
