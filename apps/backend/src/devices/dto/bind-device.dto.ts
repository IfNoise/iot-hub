import { BindDeviceSchema } from 'iot-core/schemas';
import { createZodDto } from 'nestjs-zod';
/**
 * DTO для привязки устройства
 * Автоматически генерируется из Zod схемы
 */
export class BindDeviceDto extends createZodDto(BindDeviceSchema) {}
