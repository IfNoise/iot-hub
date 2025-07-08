import { CreateGroupSchema, UpdateGroupSchema } from '@iot-hub/users';
import { createZodDto } from 'nestjs-zod';

/**
 * DTO для создания группы
 * Автоматически генерируется из Zod схемы
 */
export class CreateGroupDto extends createZodDto(CreateGroupSchema) {}

/**
 * DTO для обновления группы
 * Автоматически генерируется из Zod схемы
 */
export class UpdateGroupDto extends createZodDto(UpdateGroupSchema) {}
