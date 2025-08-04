import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// TODO: Импортировать типы после создания acm-contracts
interface UserContext {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
  groupIds?: string[];
}

// Расширяем Request для включения user
interface RequestWithUser extends Request {
  user: UserContext;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [ctx.getHandler(), ctx.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Требуется одно из разрешений: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
