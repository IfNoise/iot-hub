import { z } from "zod";

/**
 * Базовая схема сенсора
 */
export const SensorSchema = z
  .object({
    id: z.string().describe("Уникальный ID сенсора"),
    name: z.string().describe("Название сенсора"),
    description: z.string().optional().describe("Описание сенсора"),
    value: z.number().describe("Текущее значение сенсора"),
    scale: z.number().describe("Масштаб/коэффициент значения"),
    metadata: z
      .record(z.any())
      .optional()
      .describe("Дополнительные метаданные"),
  })
  .strict();

/**
 * DTO: Обновление сенсора
 */
export const SensorUpdateSchema = SensorSchema.partial()
  .omit({
    id: true,
    value: true,
  })
  .strict();
