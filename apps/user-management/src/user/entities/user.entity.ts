import { UserRole } from '../dto/create-user.dto';
import { UserStatus } from '../dto/update-user.dto';

export class User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
