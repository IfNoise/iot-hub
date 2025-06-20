import { UserBaseSchema } from '@iot-hub/users';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для ответа пользователя
 * Автоматически генерируется из Zod схемы
 */
export class UserResponseDto extends createZodDto(UserBaseSchema) {}
