import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для указания требуемых разрешений
 * Используется совместно с PermissionsGuard
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
