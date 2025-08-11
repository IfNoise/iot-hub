import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { usersTable, type DatabaseUser } from '@iot-hub/shared';
import {
  type AccessCheck,
  type AccessResult,
  type UserContext,
  type KeycloakUserSync,
  PermissionEnum,
} from '@iot-hub/acm-contracts';

@Injectable()
export class AcmService {
  constructor(
    private readonly database: DatabaseService,
    @InjectPinoLogger(AcmService.name) private readonly logger: PinoLogger
  ) {}

  /**
   * Проверка доступа пользователя к ресурсу
   */
  async checkAccess(request: AccessCheck): Promise<AccessResult> {
    try {
      // Получаем контекст пользователя из базы данных
      const { user: userContext } = await this.getUserContext(request.userId);

      // Проверяем разрешения пользователя для данного ресурса и действия
      const hasAccess = await this.evaluateAccess(
        userContext,
        request.resource,
        request.resourceId,
        request.action,
        request.context
      );

      return {
        allowed: hasAccess.allowed,
        reason: hasAccess.reason,
        requiredPermissions: hasAccess.requiredPermissions,
      };
    } catch (error) {
      console.error('Error checking access:', error);
      return {
        allowed: false,
        reason: 'Internal error during access check',
        requiredPermissions: [],
      };
    }
  }

  /**
   * Получение контекста пользователя
   */
  async getUserContext(userId: string): Promise<{ user: UserContext }> {
    this.logger.info('Getting user context', { userId });

    const user = await this.database.db
      .select()
      .from(usersTable as any)
      .where(eq(usersTable.userId as any, userId))
      .limit(1);

    if (!user.length) {
      throw new Error('User not found');
    }

    const userData = user[0] as DatabaseUser;
    return {
      user: {
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
        roles: (userData.roles || []) as Array<
          | 'admin'
          | 'personal-user'
          | 'organization-user'
          | 'group-user'
          | 'organization-admin'
          | 'group-admin'
          | 'organization-owner'
        >,
        permissions: [], // TODO: вычислить permissions из ролей
        organizationId: userData.organizationId || undefined,
        groupIds: userData.groups || [],
      },
    };
  }

  /**
   * Синхронизация пользователя из Keycloak
   */
  async syncUserFromKeycloak(
    request: KeycloakUserSync
  ): Promise<{ message: string; user: UserContext }> {
    try {
      // Ищем пользователя в базе
      const existingUser = await this.database.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.userId, request.keycloakUserId))
        .limit(1);

      let user: UserContext;

      if (existingUser.length > 0) {
        // Обновляем существующего пользователя
        const userData = existingUser[0];
        const updatedData = {
          email: request.email,
          name:
            `${request.firstName || ''} ${request.lastName || ''}`.trim() ||
            request.username ||
            userData.name,
          updatedAt: new Date(),
        };

        await this.database.db
          .update(usersTable)
          .set(updatedData)
          .where(eq(usersTable.userId, request.keycloakUserId));

        const { user: userResult } = await this.getUserContext(
          request.keycloakUserId
        );
        user = userResult;
      } else {
        // Создаем нового пользователя
        const newUser = {
          userId: request.keycloakUserId,
          email: request.email,
          name:
            `${request.firstName || ''} ${request.lastName || ''}`.trim() ||
            request.username ||
            'Unknown User',
          plan: 'free' as const,
          accountType: 'individual' as const,
        };

        await this.database.db.insert(usersTable).values(newUser);

        const userContextResult = await this.getUserContext(
          request.keycloakUserId
        );
        user = userContextResult.user;
      }

      return {
        message: 'User synchronized successfully',
        user,
      };
    } catch (error) {
      console.error('Error syncing user from Keycloak:', error);
      throw new Error('Failed to sync user: ' + (error as Error).message);
    }
  }

  /**
   * Получение разрешений пользователя
   */
  async getUserPermissions(
    userId: string,
    organizationId?: string,
    groupId?: string
  ): Promise<{ permissions: string[]; roles: string[] }> {
    // TODO: Реализовать получение разрешений в контексте
    // 1. Базовые разрешения пользователя
    // 2. Разрешения в организации
    // 3. Разрешения в группе

    console.log('Getting permissions for user:', {
      userId,
      organizationId,
      groupId,
    });

    // Временная заглушка
    return {
      permissions: ['users:read', 'devices:read'],
      roles: ['personal-user'],
    };
  }

  /**
   * Проверка конкретного разрешения
   */
  async hasPermission(
    userId: string,
    permission: string,
    organizationId?: string,
    groupId?: string,
    resourceId?: string
  ): Promise<{ hasPermission: boolean; reason?: string }> {
    // TODO: Реализовать проверку конкретного разрешения
    // 1. Получить контекст пользователя
    // 2. Проверить наличие разрешения
    // 3. Учесть контекст (организация, группа, ресурс)

    console.log('Checking permission:', {
      userId,
      permission,
      organizationId,
      groupId,
      resourceId,
    });

    // Временная заглушка
    return {
      hasPermission: true,
      reason: undefined,
    };
  }

  /**
   * Приватный метод для оценки доступа
   */
  private async evaluateAccess(
    userContext: UserContext,
    resource: string,
    resourceId: string,
    action: string,
    _context?: Record<string, unknown>
  ): Promise<AccessResult> {
    try {
      // Определяем необходимые разрешения для данного действия
      const requiredPermissions = this.getRequiredPermissions(resource, action);

      // Проверяем, есть ли у пользователя необходимые разрешения
      const hasRequiredPermissions = requiredPermissions.some((permission) =>
        userContext.permissions.includes(permission)
      );

      if (hasRequiredPermissions) {
        return {
          allowed: true,
        };
      }

      return {
        allowed: false,
        reason: `Insufficient permissions for ${action} on ${resource}`,
        requiredPermissions,
      };
    } catch (error) {
      console.error('Error evaluating access:', error);
      return {
        allowed: false,
        reason: 'Internal error during access evaluation',
        requiredPermissions: [],
      };
    }
  }

  /**
   * Получение необходимых разрешений для ресурса и действия
   */
  private getRequiredPermissions(
    resource: string,
    action: string
  ): Array<typeof PermissionEnum._type> {
    const permissionMap: Record<
      string,
      Record<string, Array<typeof PermissionEnum._type>>
    > = {
      user: {
        read: [PermissionEnum.enum['users:read']],
        write: [PermissionEnum.enum['users:write']],
        delete: [PermissionEnum.enum['users:delete']],
        manage: [PermissionEnum.enum['users:manage']],
      },
      device: {
        read: [PermissionEnum.enum['devices:read']],
        write: [PermissionEnum.enum['devices:write']],
        delete: [PermissionEnum.enum['devices:delete']],
        manage: [PermissionEnum.enum['devices:manage']],
        bind: [PermissionEnum.enum['devices:bind']],
      },
      organization: {
        read: [PermissionEnum.enum['organizations:read']],
        write: [PermissionEnum.enum['organizations:write']],
        delete: [PermissionEnum.enum['organizations:delete']],
        manage: [PermissionEnum.enum['organizations:manage']],
        invite: [PermissionEnum.enum['organizations:invite']],
      },
      group: {
        read: [PermissionEnum.enum['groups:read']],
        write: [PermissionEnum.enum['groups:write']],
        delete: [PermissionEnum.enum['groups:delete']],
        manage: [PermissionEnum.enum['groups:manage']],
        invite: [PermissionEnum.enum['groups:invite']],
      },
    };

    const resourcePermissions = permissionMap[resource.toLowerCase()];
    if (!resourcePermissions) {
      return [];
    }

    return resourcePermissions[action.toLowerCase()] || [];
  }

  /**
   * Удаляем старый метод createOrUpdateUser (заменен на логику в syncUserFromKeycloak)
   */
}
