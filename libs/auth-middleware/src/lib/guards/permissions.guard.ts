import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PermissionCheckSchema,
  AuthenticatedUserSchema,
} from '../schemas/index.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Валидация пользователя через Zod
    const parseResult = AuthenticatedUserSchema.safeParse(request.user);
    if (!parseResult.success) {
      throw new ForbiddenException('Invalid user data');
    }

    const user = parseResult.data;

    // Валидация permission check через Zod
    try {
      PermissionCheckSchema.parse({
        userId: user.userId,
        permissions: requiredPermissions,
        organizationId: user.organizationId,
      });
    } catch {
      throw new ForbiddenException('Invalid permission check data');
    }

    // Проверка permissions
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
