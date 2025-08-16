import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCheckSchema, AuthenticatedUserSchema } from '../schemas/index.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Валидация пользователя через Zod
    const parseResult = AuthenticatedUserSchema.safeParse(request.user);
    if (!parseResult.success) {
      throw new ForbiddenException('Invalid user data');
    }

    const user = parseResult.data;

    // Валидация role check через Zod
    try {
      RoleCheckSchema.parse({
        userId: user.userId,
        roles: requiredRoles,
        organizationId: user.organizationId,
      });
    } catch {
      throw new ForbiddenException('Invalid role check data');
    }

    // Проверка ролей (OR логика - достаточно одной из требуемых ролей)
    const userRoleStrings = user.roles.map((role) => role.toString());
    const hasRole = requiredRoles.some((role) =>
      userRoleStrings.includes(role)
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
