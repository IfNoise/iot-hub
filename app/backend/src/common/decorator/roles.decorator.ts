// src/common/decorator/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator для задания требуемых ролей для эндпоинта
 *
 * @example
 * ```typescript
 * @Get('admin-only')
 * @Roles('admin')
 * @UseGuards(RolesGuard)
 * adminOnlyEndpoint() {
 *   return 'Only admins can see this';
 * }
 *
 * @Get('user-or-admin')
 * @Roles('user', 'admin')
 * @UseGuards(RolesGuard)
 * userOrAdminEndpoint() {
 *   return 'Users and admins can see this';
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
