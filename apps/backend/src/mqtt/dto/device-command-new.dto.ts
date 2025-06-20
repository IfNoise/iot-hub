import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  BaseDeviceCommandSchema,
  DeviceCommandSchema,
  DeviceCommandNoResponseSchema,
  DeviceCommandResponseSchema,
} from '@iot-hub/mqtt';

/**
 * DTO классы для MQTT команд, созданные из контрактов
 */

// Создаем базовые DTO классы используя nestjs-zod
export class BaseDeviceCommandDto extends createZodDto(
  BaseDeviceCommandSchema
) {}

// Экспортируем типы
export type DeviceCommand = z.infer<typeof DeviceCommandSchema>;
export type DeviceCommandNoResponse = z.infer<
  typeof DeviceCommandNoResponseSchema
>;
export type DeviceCommandResponse = z.infer<typeof DeviceCommandResponseSchema>;

// Для простоты использования создаем общие DTO классы без дискриминации
export class DeviceCommandDto {
  userId!: string;
  deviceId!: string;
  method!: string;
  params?: Record<string, unknown>;
  timeout?: number;
}

export class DeviceCommandNoResponseDto {
  userId!: string;
  deviceId!: string;
  method!: string;
  params?: Record<string, unknown>;
}

export class DeviceCommandResponseDto {
  id!: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
  metadata?: {
    executionTime?: number;
    sentAt?: string;
    receivedAt?: string;
  };
}
