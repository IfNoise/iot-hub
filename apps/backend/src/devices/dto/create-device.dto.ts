import { CreateDeviceSchema } from 'iot-core/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания устройства
 * Автоматически генерируется из Zod схемы
 */
export class CreateDeviceDto extends createZodDto(CreateDeviceSchema) {}
export class CreateDeviceResponseDto extends createZodDto(CreateDeviceSchema) {}
