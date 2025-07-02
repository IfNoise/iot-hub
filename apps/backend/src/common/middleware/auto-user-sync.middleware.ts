import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { KeycloakUserService } from '../services/keycloak-user.service.js';
import { AuthenticatedUser } from '../types/keycloak-user.interface.js';

@Injectable()
export class AutoUserSyncMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AutoUserSyncMiddleware.name);

  constructor(private readonly keycloakUserService: KeycloakUserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Проверяем, есть ли пользователь в запросе (после аутентификации Keycloak)
      const keycloakUser = req.user as AuthenticatedUser;

      if (keycloakUser) {
        this.logger.debug(`Синхронизация пользователя: ${keycloakUser.email}`);

        // Автоматически синхронизируем пользователя с базой данных
        await this.keycloakUserService.syncUser(keycloakUser);

        this.logger.debug(
          `Пользователь синхронизирован: ${keycloakUser.email}`
        );
      }
    } catch (error) {
      this.logger.error('Ошибка при синхронизации пользователя:', error);
      // Не блокируем выполнение запроса при ошибке синхронизации
      // Пользователь все равно может продолжить работу с Keycloak данными
    }

    next();
  }
}
