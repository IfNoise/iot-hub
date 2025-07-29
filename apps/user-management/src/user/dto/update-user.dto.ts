import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { UserRole } from './create-user.dto';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

const UpdateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  organizationId: z.string().uuid().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

export type UpdateUserType = z.infer<typeof UpdateUserSchema>;
