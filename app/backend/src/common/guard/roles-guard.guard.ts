// src/common/guards/roles.guard.ts
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

    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !user.roles) {
      throw new ForbiddenException('No roles found');
    }

    const hasRole = user.roles.some((role: string) =>
      requiredRoles.includes(role)
    );
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
