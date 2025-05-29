import { z } from "zod";
import {
  DiscreteInputSchema,
  UpdateDiscreteInputSchema,
  AnalogInputSchema,
  UpdateAnalogInputSchema,
  DiscreteOutputSchema,
  UpdateDiscreteOutputSchema,
  AnalogOutputSchema,
  UpdateAnalogOutputSchema,
} from "../../schemas/devices/io.schema";

/**
 * Типы
 */
export type DiscreteInput = z.infer<typeof DiscreteInputSchema>;
export type UpdateDiscreteInputDTO = z.infer<typeof UpdateDiscreteInputSchema>;
export type AnalogInput = z.infer<typeof AnalogInputSchema>;
export type UpdateAnalogInputDTO = z.infer<typeof UpdateAnalogInputSchema>;
export type DiscreteOutput = z.infer<typeof DiscreteOutputSchema>;
export type UpdateDiscreteOutputDTO = z.infer<
  typeof UpdateDiscreteOutputSchema
>;
export type AnalogOutput = z.infer<typeof AnalogOutputSchema>;
export type UpdateAnalogOutputDTO = z.infer<typeof UpdateAnalogOutputSchema>;
