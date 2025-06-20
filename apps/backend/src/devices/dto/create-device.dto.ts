import { CreateDeviceBaseSchema } from '@iot-hub/devices';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания устройства
 * Автоматически генерируется из Zod схемы
 */
export class CreateDeviceDto extends createZodDto(CreateDeviceBaseSchema) {}
export class CreateDeviceResponseDto extends createZodDto(
  CreateDeviceBaseSchema
) {}
