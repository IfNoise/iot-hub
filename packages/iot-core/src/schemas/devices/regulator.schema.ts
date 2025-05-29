import { z } from "zod";

/**
 * Перечисления
 */
export const DiscreteRegulatorModeSchema = z.enum(["on", "off", "auto"]);
export const AnalogRegulatorModeSchema = z.enum(["on", "off", "auto"]);
export const OutputTypeSchema = z.enum(["digital", "analog"]);

/**
 * Схема оповещений регулятора
 */
export const RegulatorAlarmSchema = z
  .object({
    upperLimit: z.number().describe("Верхний предел срабатывания"),
    lowerLimit: z.number().describe("Нижний предел срабатывания"),
  })
  .strict();

/**
 * Схема дискретного регулятора
 */
export const DiscreteRegulatorSchema = z
  .object({
    id: z.string().describe("Уникальный ID регулятора"),
    name: z.string().describe("Название регулятора"),
    mode: DiscreteRegulatorModeSchema.default("auto").describe("Режим работы"),
    parameter: z.string().describe("Контролируемый параметр"),
    setpoint: z.number().describe("Целевое значение"),
    hysteresis: z.number().min(0).max(10).describe("Гистерезис"),
    alarm: RegulatorAlarmSchema.optional().describe("Настройки тревог"),
    output: z.string().describe("ID выходного устройства для управления"),
  })
  .strict();

/**
 * DTO: Обновление дискретного регулятора
 */
export const UpdateDiscreteRegulatorSchema = DiscreteRegulatorSchema.partial()
  .extend({
    id: z.string().describe("Уникальный ID регулятора"),
  })
  .strict();

/**
 * Схема аналогового регулятора
 */
export const AnalogRegulatorSchema = z
  .object({
    id: z.string().describe("Уникальный ID регулятора"),
    name: z.string().describe("Название регулятора"),
    mode: AnalogRegulatorModeSchema.default("auto").describe("Режим работы"),
    type: OutputTypeSchema.describe("Тип выхода"),
    parameter: z.string().describe("Контролируемый параметр"),
    setpoint: z.number().describe("Целевое значение"),
    Kp: z.number().min(0).max(100).describe("Пропорциональный коэффициент"),
    Ki: z.number().min(0).max(100).describe("Интегральный коэффициент"),
    Kd: z.number().min(0).max(100).describe("Дифференциальный коэффициент"),
    alarm: RegulatorAlarmSchema.optional().describe("Настройки тревог"),
    output: z.string().describe("ID выходного устройства для управления"),
  })
  .strict();

/**
 * DTO: Обновление аналогового регулятора
 */
export const UpdateAnalogRegulatorSchema = AnalogRegulatorSchema.partial()
  .extend({
    id: z.string().describe("Уникальный ID регулятора"),
  })
  .strict();
