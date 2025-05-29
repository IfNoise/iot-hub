import { z } from "zod";
import {
  IrrigatorSchema,
  CreateIrrigatorSchema,
  UpdateIrrigatorSchema,
  IrrigationPresetSchema,
  IrrigatorModeSchema,
} from "../../schemas/devices/irrigator.schema";
/**
 * Типы
 */
export type Irrigator = z.infer<typeof IrrigatorSchema>;
export type CreateIrrigatorDTO = z.infer<typeof CreateIrrigatorSchema>;
export type UpdateIrrigatorDTO = z.infer<typeof UpdateIrrigatorSchema>;
export type IrrigationPreset = z.infer<typeof IrrigationPresetSchema>;
export type IrrigatorMode = z.infer<typeof IrrigatorModeSchema>;
