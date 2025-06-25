import { CreateDeviceSchema } from '@iot-hub/devices';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания устройства
 * Автоматически генерируется из унифицированной Zod схемы
 */
export class CreateDeviceDto extends createZodDto(CreateDeviceSchema) {}
export class CreateDeviceResponseDto extends createZodDto(
  CreateDeviceSchema
) {}
