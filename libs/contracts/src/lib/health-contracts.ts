import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Схема для общей проверки здоровья
 */
export const GeneralHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string(),
  services: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    details: z.record(z.any()).optional(),
  })),
});

/**
 * Схема для проверки здоровья логирования
 */
export const LoggingHealthSchema = z.object({
  status: z.enum(['healthy', 'warning', 'error']),
  details: z.record(z.any()),
  timestamp: z.string(),
});

/**
 * Схема для статистики логов
 */
export const LogStatsSchema = z.object({
  stats: z.record(z.any()),
  timestamp: z.string(),
});

/**
 * REST API контракты для проверки здоровья системы
 */
export const healthContract = c.router({
  // GET /health - Общая проверка здоровья
  checkHealth: {
    method: 'GET',
    path: '/health',
    responses: {
      200: GeneralHealthSchema,
    },
    summary: 'Общая проверка здоровья системы',
  },

  // GET /health/logging - Проверить здоровье системы логирования
  checkLoggingHealth: {
    method: 'GET',
    path: '/health/logging',
    responses: {
      200: LoggingHealthSchema,
    },
    summary: 'Проверить здоровье системы логирования',
  },

  // GET /health/logs/stats - Получить статистику логов
  getLogStats: {
    method: 'GET',
    path: '/health/logs/stats',
    responses: {
      200: LogStatsSchema,
    },
    summary: 'Получить статистику логов',
  },
});

export type HealthContract = typeof healthContract;
