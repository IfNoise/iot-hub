import { z } from "zod";
import {
  DiscreteTimerSchema,
  UpdateDiscreteTimerSchema,
  AnalogTimerSchema,
  UpdateAnalogTimerSchema,
} from "../../schemas/devices/timer.schema";
/**
 * Типы
 */
export type DiscreteTimer = z.infer<typeof DiscreteTimerSchema>;
export type UpdateDiscreteTimerDTO = z.infer<typeof UpdateDiscreteTimerSchema>;
export type AnalogTimer = z.infer<typeof AnalogTimerSchema>;
export type UpdateAnalogTimerDTO = z.infer<typeof UpdateAnalogTimerSchema>;
