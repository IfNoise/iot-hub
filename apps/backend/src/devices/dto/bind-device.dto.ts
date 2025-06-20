import { BindDeviceBaseSchema } from '@iot-hub/devices';
import { createZodDto } from 'nestjs-zod';
/**
 * DTO для привязки устройства
 * Автоматически генерируется из Zod схемы
 */
export class BindDeviceDto extends createZodDto(BindDeviceBaseSchema) {}
