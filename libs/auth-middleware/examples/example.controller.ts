import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  RequirePermissions,
  RequireRoles,
  PermissionsGuard,
  RolesGuard,
  type AuthenticatedUser,
} from '../src/index.js';

/**
 * Пример контроллера демонстрирующий использование auth-middleware
 */
@Controller('example')
@UseGuards(RolesGuard, PermissionsGuard)
export class ExampleController {
  /**
   * Эндпоинт доступный любому аутентифицированному пользователю
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'User profile',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        permissions: user.permissions,
        organizationId: user.organizationId,
        groupIds: user.groupIds,
      },
    };
  }

  /**
   * Эндпоинт требующий права на чтение пользователей
   */
  @Get('users')
  @RequirePermissions('users:read')
  async getUsers(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Users list',
      requestedBy: user.name,
      users: [
        // Здесь был бы реальный список пользователей
      ],
    };
  }

  /**
   * Эндпоинт требующий права на управление пользователями
   */
  @Get('users/manage')
  @RequirePermissions('users:manage', 'users:write')
  async manageUsers(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'User management interface',
      admin: user.name,
      permissions: user.permissions,
    };
  }

  /**
   * Эндпоинт только для администраторов
   */
  @Get('admin')
  @RequireRoles('admin', 'organization-admin')
  async adminOnlyEndpoint(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Admin only data',
      admin: user.name,
      adminRoles: user.roles.filter(role => 
        ['admin', 'organization-admin', 'organization-owner'].includes(role)
      ),
    };
  }

  /**
   * Эндпоинт требующий и роли, и права доступа
   */
  @Get('super-admin')
  @RequireRoles('admin')
  @RequirePermissions('system:admin')
  async superAdminEndpoint(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Super admin area',
      user: user.name,
      systemPermissions: user.permissions.filter(p => p.startsWith('system:')),
    };
  }

  /**
   * Получение определенного поля пользователя
   */
  @Get('email')
  async getCurrentUserEmail(@CurrentUser('email') email: string) {
    return {
      email,
    };
  }

  /**
   * Получение ролей пользователя
   */
  @Get('roles')
  async getCurrentUserRoles(@CurrentUser('roles') roles: string[]) {
    return {
      roles,
    };
  }

  /**
   * Информация о токене
   */
  @Get('token-info')
  async getTokenInfo(
    @CurrentUser('tokenExp') tokenExp: number,
    @CurrentUser('sessionId') sessionId: string | undefined
  ) {
    return {
      tokenExp,
      sessionId,
      expiresAt: new Date(tokenExp * 1000).toISOString(),
      isExpiringSoon: tokenExp < (Date.now() / 1000) + 300, // expires in 5 minutes
    };
  }
}
