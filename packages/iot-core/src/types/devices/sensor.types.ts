import { z } from "zod";
import {
  SensorSchema,
  SensorUpdateSchema,
} from "../../schemas/devices/sensor.schema";

/**
 * Типы
 */
export type Sensor = z.infer<typeof SensorSchema>;
export type SensorUpdateDTO = z.infer<typeof SensorUpdateSchema>;
