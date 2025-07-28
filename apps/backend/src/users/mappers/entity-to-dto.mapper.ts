import { User } from '../entities/user.entity.js';
import { CreateUserDto } from '../dto/create-user.dto.js';

export function mapUserEntityToDto(user: User): CreateUserDto {
  const dto: Partial<CreateUserDto> = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    avatar: user.avatar === null ? undefined : user.avatar,
    roles: user.roles,
    balance:
      typeof user.balance === 'string' ? Number(user.balance) : user.balance,
    plan: user.plan,
    accountType: user.accountType,
    organizationId:
      user.keycloakOrganizationId === null
        ? undefined
        : user.keycloakOrganizationId,
    groups: user.groups === null ? undefined : user.groups,
    metadata: user.metadata === null ? undefined : user.metadata,
  };
  if (user.planExpiresAt && user.planExpiresAt instanceof Date) {
    dto.planExpiresAt = user.planExpiresAt;
  }
  return dto as CreateUserDto;
}
