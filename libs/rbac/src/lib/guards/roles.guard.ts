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
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles.some((userRole) => userRole === role)
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Требуется одна из ролей: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
