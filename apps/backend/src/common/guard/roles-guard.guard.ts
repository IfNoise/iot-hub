// src/common/guards/roles.guard.ts
import { User } from '@iot-hub/users';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    const hasRole = requiredRoles.some((role) =>
      (user.roles as string[]).includes(role)
    );
    if (!hasRole) {
      throw new ForbiddenException(
        `Требуется роль: ${requiredRoles.join(' или ')}`
      );
    }

    return true;
  }
}
