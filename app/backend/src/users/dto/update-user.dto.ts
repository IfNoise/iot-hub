import { UpdateUserSchema } from '@iot-hub/iot-core/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для обновления пользователя
 * Автоматически генерируется из Zod схемы
 */
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
