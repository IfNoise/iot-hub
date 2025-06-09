import { CreateUserSchema } from 'iot-core/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания пользователя
 * Автоматически генерируется из Zod схемы
 */
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
