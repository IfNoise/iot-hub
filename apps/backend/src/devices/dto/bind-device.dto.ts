import { BindDeviceSchema } from '@iot-hub/devices';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для привязки устройства
 * Автоматически генерируется из Zod схемы
 *
 * Примечание: ownerId (userId) НЕ передается в теле запроса,
 * а извлекается из JWT токена через middleware аутентификации
 */
export class BindDeviceDto extends createZodDto(BindDeviceSchema) {}

/**
 * Расширенный DTO для внутреннего использования в сервисе
 * Включает ownerId, который добавляется контроллером из middleware
 */
export interface BindDeviceWithOwnerDto {
  id: string;
  ownerId: string;
}
