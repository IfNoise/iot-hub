import { DeepPartial } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { User } from '../entities/user.entity.js';

export function userDtoToEntity(dto: CreateUserDto): DeepPartial<User> {
  const entity: DeepPartial<User> = {};
  // userId всегда строка (DTO должен это гарантировать)
  if (!dto.userId) {
    throw new Error('userId is required for user entity');
  }
  entity.userId = dto.userId;
  entity.email = dto.email;
  entity.name = dto.name;
  entity.avatar = dto.avatar === null ? undefined : dto.avatar;
  entity.roles = dto.roles ?? ['personal-user'];
  entity.balance = dto.balance ?? 0;
  entity.plan = dto.plan ?? 'free';
  entity.planExpiresAt = dto.planExpiresAt ?? undefined;
  entity.accountType = dto.accountType ?? 'individual';
  // organizationId из DTO кладём в keycloakOrganizationId
  entity.keycloakOrganizationId =
    dto.organizationId === null ? undefined : dto.organizationId;
  entity.groups = dto.groups === null ? undefined : dto.groups;
  entity.metadata = dto.metadata === null ? undefined : dto.metadata;
  // organizationId (в базе) не заполняем напрямую из DTO
  return entity;
}
