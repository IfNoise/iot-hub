import { z } from "zod";
import {
  DiscreteRegulatorSchema,
  UpdateDiscreteRegulatorSchema,
  AnalogRegulatorSchema,
  UpdateAnalogRegulatorSchema,
} from "../../schemas/devices/regulator.schema";

/**
 * Типы
 */
export type DiscreteRegulator = z.infer<typeof DiscreteRegulatorSchema>;
export type UpdateDiscreteRegulatorDTO = z.infer<
  typeof UpdateDiscreteRegulatorSchema
>;
export type AnalogRegulator = z.infer<typeof AnalogRegulatorSchema>;
export type UpdateAnalogRegulatorDTO = z.infer<
  typeof UpdateAnalogRegulatorSchema
>;
