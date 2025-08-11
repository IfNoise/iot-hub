import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import {
  acmContract,
  AccessCheckSchema,
  KeycloakUserSyncSchema,
} from '@iot-hub/acm-contracts';
// import { Permissions, RolesGuard } from '@iot-hub/rbac'; // Временно отключено
import { AcmService } from './acm.service.js';

@Controller()
// @UseGuards(RolesGuard) // Временно отключено
export class AcmController {
  constructor(private readonly acmService: AcmService) {}

  /**
   * Проверка доступа пользователя к ресурсу
   */
  @TsRestHandler(acmContract.checkAccess)
  // @Permissions('system:admin', 'acm:access:check')
  async checkAccess() {
    return tsRestHandler(acmContract.checkAccess, async ({ body }) => {
      const request = AccessCheckSchema.parse(body);
      const response = await this.acmService.checkAccess(request);

      return {
        status: 200,
        body: response,
      };
    });
  }

  /**
   * Получение контекста пользователя с правами доступа
   */
  @TsRestHandler(acmContract.getUserContext)
  // @Permissions('users:read')
  async getUserContext() {
    return tsRestHandler(acmContract.getUserContext, async ({ params }) => {
      const { userId } = params;
      const userContext = await this.acmService.getUserContext(userId);

      return {
        status: 200,
        body: userContext.user,
      };
    });
  }

  /**
   * Синхронизация пользователя из Keycloak
   */
  @TsRestHandler(acmContract.syncUserFromKeycloak)
  // @Permissions('system:admin')
  async syncUserFromKeycloak() {
    return tsRestHandler(acmContract.syncUserFromKeycloak, async ({ body }) => {
      const syncRequest = KeycloakUserSyncSchema.parse(body);
      const result = await this.acmService.syncUserFromKeycloak(syncRequest);

      return {
        status: 200,
        body: result,
      };
    });
  }

  /**
   * Получение разрешений пользователя
   */
  @TsRestHandler(acmContract.getUserPermissions)
  // @Permissions('users:read')
  async getUserPermissions() {
    return tsRestHandler(
      acmContract.getUserPermissions,
      async ({ params, query }) => {
        const { userId } = params;
        const { organizationId, groupId } = query;
        const permissions = await this.acmService.getUserPermissions(
          userId,
          organizationId,
          groupId
        );

        return {
          status: 200,
          body: permissions,
        };
      }
    );
  }

  /**
   * Проверка конкретного разрешения
   */
  @TsRestHandler(acmContract.hasPermission)
  // @Permissions('users:read')
  async hasPermission() {
    return tsRestHandler(
      acmContract.hasPermission,
      async ({ params, body }) => {
        const { userId } = params;
        const { permission, organizationId, groupId, resourceId } = body;
        const result = await this.acmService.hasPermission(
          userId,
          permission,
          organizationId,
          groupId,
          resourceId
        );

        return {
          status: 200,
          body: result,
        };
      }
    );
  }
}
