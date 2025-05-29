import { z } from "zod";

/**
 * Перечисления
 */
export const IrrigatorModeSchema = z.enum(["on", "off", "auto", "preset"]);

/**
 * Схема пресета ирригации
 */
export const IrrigationPresetSchema = z.array(
  z.object({
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
  })
);

/**
 * Схема ирригатора
 */
export const IrrigatorSchema = z
  .object({
    id: z.string().describe("Уникальный ID ирригатора"),
    name: z.string().describe("Название ирригатора"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    mode: IrrigatorModeSchema.default("auto").describe("Режим работы"),
    preset: IrrigationPresetSchema.optional().describe("Пресеты расписания"),
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
    numbIrrigations: z.number().optional().describe("Количество ирригаций"),
    irrigationwindow: z.number().optional().describe("Окно ирригации"),
    autoManualOff: z.boolean().optional().describe("Автоматическое отключение"),
    autoManualOffInterval: z
      .number()
      .optional()
      .describe("Интервал автоотключения"),
    output: z.string().describe("ID выходного устройства для управления"),
  })
  .strict();

/**
 * DTO: Создание ирригатора
 */
export const CreateIrrigatorSchema = IrrigatorSchema.omit({
  id: true,
}).strict();

/**
 * DTO: Обновление ирригатора
 */
export const UpdateIrrigatorSchema = IrrigatorSchema.partial()
  .extend({
    id: z.string().describe("Уникальный ID ирригатора"),
  })
  .strict();
