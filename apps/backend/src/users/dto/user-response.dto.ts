import { UserBaseSchema } from 'iot-core/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для ответа пользователя
 * Автоматически генерируется из Zod схемы
 */
export class UserResponseDto extends createZodDto(UserBaseSchema) {}
