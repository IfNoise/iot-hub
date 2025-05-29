import { z } from "zod";

/**
 * Схема дискретного входа
 */
export const DiscreteInputSchema = z
  .object({
    id: z.string().describe("Уникальный ID входа"),
    name: z.string().describe("Название входа"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    state: z.boolean().describe("Состояние входа"),
  })
  .strict();

/**
 * DTO: Обновление дискретного входа
 */
export const UpdateDiscreteInputSchema = z
  .object({
    name: z.string().optional().describe("Название входа"),
    enabled: z.boolean().optional().describe("Статус активации"),
  })
  .strict();

/**
 * Схема аналогового входа
 */
export const AnalogInputSchema = z
  .object({
    id: z.string().describe("Уникальный ID входа"),
    name: z.string().describe("Название входа"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    value: z.number().describe("Значение входа"),
    scale: z.number().describe("Масштаб/коэффициент"),
  })
  .strict();

/**
 * DTO: Обновление аналогового входа
 */
export const UpdateAnalogInputSchema = z
  .object({
    name: z.string().optional().describe("Название входа"),
    enabled: z.boolean().optional().describe("Статус активации"),
    scale: z.number().optional().describe("Масштаб/коэффициент"),
  })
  .strict();

/**
 * Схема дискретного выхода
 */
export const DiscreteOutputSchema = z
  .object({
    id: z.string().describe("Уникальный ID выхода"),
    name: z.string().describe("Название выхода"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    state: z.boolean().describe("Состояние выхода"),
  })
  .strict();

/**
 * DTO: Обновление дискретного выхода
 */
export const UpdateDiscreteOutputSchema = z
  .object({
    name: z.string().optional().describe("Название выхода"),
    enabled: z.boolean().optional().describe("Статус активации"),
  })
  .strict();

/**
 * Схема аналогового выхода
 */
export const AnalogOutputSchema = z
  .object({
    id: z.string().describe("Уникальный ID выхода"),
    name: z.string().describe("Название выхода"),
    enabled: z.boolean().default(true).describe("Статус активации"),
    value: z.number().describe("Значение выхода"),
    scale: z.number().describe("Масштаб/коэффициент"),
  })
  .strict();

/**
 * DTO: Обновление аналогового выхода
 */
export const UpdateAnalogOutputSchema = z
  .object({
    name: z.string().optional().describe("Название выхода"),
    enabled: z.boolean().optional().describe("Статус активации"),
    scale: z.number().optional().describe("Масштаб/коэффициент"),
  })
  .strict();

/**
 * Объединения схем ввода-вывода
 */
export const InputsSchema = z.union([DiscreteInputSchema, AnalogInputSchema]);
export const OutputsSchema = z.union([
  DiscreteOutputSchema,
  AnalogOutputSchema,
]);
