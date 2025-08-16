import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ACMClientService } from '../services/acm-client.service.js';
import {
  AuthenticatedUserSchema,
  type AuthMiddlewareConfig,
} from '../schemas/index.js';

@Injectable()
export class RbacMiddleware implements NestMiddleware {
  private acmClient: ACMClientService;

  constructor(private readonly config: AuthMiddlewareConfig) {
    this.acmClient = new ACMClientService(this.config);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Если нет пользователя, пропускаем (должен быть установлен JWT middleware)
    if (!req.user) {
      return next();
    }

    try {
      // Получаем permissions из ACM используя контракт
      const permissions = await this.acmClient.getUserPermissions(
        req.user.userId,
        {
          organizationId: req.user.organizationId,
          // Берем первую группу если есть
          groupId: req.user.groupIds?.[0],
        }
      );

      // Обогащаем пользователя permissions и валидируем
      const enrichedUser = AuthenticatedUserSchema.parse({
        ...req.user,
        permissions,
      });

      req.user = enrichedUser;
      next();
    } catch (error) {
      console.error('RBAC enrichment failed:', error);
      // Продолжаем с пустыми permissions вместо блокировки
      const userWithEmptyPermissions = {
        ...req.user,
        permissions: [],
      };

      try {
        req.user = AuthenticatedUserSchema.parse(userWithEmptyPermissions);
      } catch (validationError) {
        console.error('User validation failed:', validationError);
        req.user = { ...req.user, permissions: [] };
      }

      next();
    }
  }
}
