import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Схемы для запросов тестирования метрик
 */
export const MetricsTestRequestSchema = z.object({
  deviceCount: z.number().optional(),
  messageCount: z.number().optional(),
  errorCount: z.number().optional(),
});

export const SimulationRequestSchema = z.object({
  scenario: z.enum([
    'device_lifecycle',
    'mqtt_load',
    'api_load',
    'auth_test',
    'error_simulation',
  ]),
  deviceCount: z.number().optional(),
  messageCount: z.number().optional(),
  durationMs: z.number().optional(),
});

/**
 * Схемы для ответов
 */
export const MetricsInfoSchema = z.object({
  status: z.string(),
  opentelemetry: z.object({
    initialized: z.boolean(),
    config: z.record(z.any()),
    endpoints: z.object({
      traces: z.string(),
      metrics: z.string(),
      logs: z.string(),
    }),
  }),
  availableMetrics: z.object({
    automatic: z.array(z.string()),
    custom: z.array(z.string()),
  }),
});

export const MetricsDataSchema = z.record(z.any());

export const MetricsTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  results: z.record(z.any()),
});

export const SimulationResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  scenario: z.string(),
  results: z.record(z.any()),
});

/**
 * REST API контракты для метрик
 */
export const metricsContract = c.router({
  // GET /metrics/info - Получить информацию о метриках
  getMetricsInfo: {
    method: 'GET',
    path: '/metrics/info',
    responses: {
      200: MetricsInfoSchema,
    },
    summary: 'Получить информацию о системе метрик',
  },

  // GET /metrics/data - Получить данные метрик
  getMetricsData: {
    method: 'GET',
    path: '/metrics/data',
    responses: {
      200: MetricsDataSchema,
    },
    summary: 'Получить текущие данные метрик',
  },

  // POST /metrics/test - Протестировать метрики
  testMetrics: {
    method: 'POST',
    path: '/metrics/test',
    body: MetricsTestRequestSchema,
    responses: {
      200: MetricsTestResultSchema,
    },
    summary: 'Протестировать систему метрик',
  },

  // POST /metrics/simulate - Запустить симуляцию
  simulate: {
    method: 'POST',
    path: '/metrics/simulate',
    body: SimulationRequestSchema,
    responses: {
      200: SimulationResultSchema,
    },
    summary: 'Запустить симуляцию нагрузки',
  },
});

export type MetricsContract = typeof metricsContract;
