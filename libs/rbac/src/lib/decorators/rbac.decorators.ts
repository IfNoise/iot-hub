import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для указания требуемых ролей
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * Декоратор для указания требуемых разрешений
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * Декоратор для указания организации в параметре
 */
export const OrganizationParam = (paramName = 'organizationId') =>
  SetMetadata('organizationParam', paramName);

/**
 * Декоратор для указания группы в параметре
 */
export const GroupParam = (paramName = 'groupId') =>
  SetMetadata('groupParam', paramName);
