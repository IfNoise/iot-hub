import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для указания требуемых ролей
 * Используется совместно с RolesGuard
 */
export const RequireRoles = (...roles: string[]) =>
  SetMetadata('roles', roles);
