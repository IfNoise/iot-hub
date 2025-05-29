// packages/iot-core/schemas/devices/timers.schema.ts
import { z } from "zod";

/**
 * Перечисления
 */
export const TimerModeEnum = z.enum(["on", "off", "auto"]);

/**
 * Схема дискретного таймера
 */
export const DiscreteTimerSchema = z
  .object({
    id: z.string().describe("Уникальный ID таймера"),
    name: z.string().describe("Название таймера"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    mode: TimerModeEnum.default("auto").describe("Режим работы таймера"),
    startTime: z
      .number()
      .min(0)
      .max(1439)
      .describe("Время начала (минуты после полуночи)"),
    endTime: z
      .number()
      .min(0)
      .max(1439)
      .describe("Время окончания (минуты после полуночи)"),
    output: z.string().describe("ID выходного устройства для управления"),
  })
  .strict();

/**
 * DTO: Обновление дискретного таймера
 */
export const UpdateDiscreteTimerSchema = DiscreteTimerSchema.partial()
  .extend({
    id: z.string().describe("Уникальный ID таймера"),
  })
  .strict();

/**
 * Схема аналогового таймера
 */
export const AnalogTimerSchema = z
  .object({
    id: z.string().describe("Уникальный ID таймера"),
    name: z.string().describe("Название таймера"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    mode: TimerModeEnum.default("auto").describe("Режим работы таймера"),
    sunriseTime: z
      .number()
      .min(0)
      .max(1439)
      .describe("Время восхода (минуты после полуночи)"),
    sunsetTime: z
      .number()
      .min(0)
      .max(1439)
      .describe("Время заката (минуты после полуночи)"),
    maxLightLevel: z
      .number()
      .min(0)
      .max(1)
      .describe("Максимальный уровень освещения"),
    fadeTime: z.number().min(0).describe("Время перехода (затухания)"),
    output: z.string().describe("ID выходного устройства для управления"),
  })
  .strict();

/**
 * DTO: Обновление аналогового таймера
 */
export const UpdateAnalogTimerSchema = AnalogTimerSchema.partial()
  .extend({
    id: z.string().describe("Уникальный ID таймера"),
  })
  .strict();
