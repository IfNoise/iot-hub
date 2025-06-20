import { CreateUserSchema } from '@iot-hub/users';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания пользователя
 * Автоматически генерируется из Zod схемы
 */
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
