import { Injectable } from '@nestjs/common';
import type {
  ACMContext,
  AccessCheck,
  AccessResult,
  AuthMiddlewareConfig,
} from '../schemas/index.js';

@Injectable()
export class ACMClientService {
  constructor(private readonly config: AuthMiddlewareConfig) {
    // Конфигурация будет использована при реализации реальных вызовов к ACM
    if (this.config.acm.baseUrl) {
      console.log(
        `ACM Client initialized with base URL: ${this.config.acm.baseUrl}`
      );
    }
  }

  /**
   * Получение разрешений пользователя из ACM
   */
  async getUserPermissions(
    userId: string,
    context?: ACMContext
  ): Promise<string[]> {
    try {
      // Здесь должен быть реальный вызов к ACM API
      // Временно возвращаем пустой массив
      // TODO: реализовать вызов к ACM когда API будет готов

      console.log(
        `Getting permissions for user ${userId} with context:`,
        context
      );

      const permissions: string[] = [];

      // Логика получения permissions из ACM
      // const response = await this.client.getUserPermissions({
      //   params: { userId },
      //   query: {
      //     organizationId: context?.organizationId,
      //     groupId: context?.groupId,
      //   },
      // });

      // if (response.status === 200) {
      //   return response.body.permissions;
      // }

      return permissions;
    } catch (error) {
      console.error('Failed to get user permissions from ACM:', error);
      // В случае ошибки возвращаем пустые permissions
      return [];
    }
  }

  /**
   * Проверка доступа через ACM
   */
  async checkAccess(request: AccessCheck): Promise<AccessResult> {
    try {
      // Здесь должен быть реальный вызов к ACM API
      // Временно возвращаем отказ в доступе
      // TODO: реализовать вызов к ACM когда API будет готов

      console.log('Checking access for request:', request);

      // const response = await this.client.checkAccess({
      //   body: request,
      // });

      // if (response.status === 200) {
      //   return response.body;
      // }

      return {
        allowed: false,
        reason: 'ACM service unavailable',
      };
    } catch (error) {
      console.error('Access check failed:', error);
      return {
        allowed: false,
        reason: 'ACM service error',
      };
    }
  }

  /**
   * Проверка доступности ACM сервиса
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Здесь должен быть health check к ACM
      // TODO: реализовать health check когда API будет готов
      return true;
    } catch (error) {
      console.error('ACM health check failed:', error);
      return false;
    }
  }
}
