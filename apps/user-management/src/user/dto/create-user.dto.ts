import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

const CreateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  organizationId: z.string().uuid('Invalid organization ID format'),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  metadata: z.record(z.unknown()).optional(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export type CreateUserType = z.infer<typeof CreateUserSchema>;
