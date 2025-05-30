import { z } from 'zod';
import {
  BindDeviceSchema,
  CreateDeviceSchema,
  DeviceInternalStateSchema,
  DeviceSchema,
} from '../../schemas/devices/device.schema';

/**
 * Типы
 */
export type DeviceInternalState = z.infer<typeof DeviceInternalStateSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type CreateDeviceDto = z.infer<typeof CreateDeviceSchema>;
export type BindDeviceDto = z.infer<typeof BindDeviceSchema>;
