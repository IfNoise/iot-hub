// src/common/services/keycloak-user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser } from '../types/keycloak-user.interface.js';
import { UsersService } from '../../users/users.service.js';
import { User } from '../../users/entities/user.entity.js';

@Injectable()
export class KeycloakUserService {
  constructor(
    private readonly usersService: UsersService,
    @InjectPinoLogger(KeycloakUserService.name)
    private readonly logger: PinoLogger
  ) {}

  /**
   * Синхронизирует пользователя из Keycloak с локальной базой данных
   */
  async syncUser(keycloakUser: AuthenticatedUser): Promise<User> {
    try {
      // Используем новый метод createOrUpdate для атомарной операции
      const user = await this.usersService.createOrUpdate(keycloakUser.id, {
        userId: keycloakUser.id,
        email: keycloakUser.email,
        name: keycloakUser.name,
        avatar: keycloakUser.avatar,
        role: keycloakUser.role,
      });

      this.logger.info(
        `Пользователь синхронизирован: ${user.email} (${user.id})`
      );

      return user;
    } catch (error: any) {
      this.logger.error(
        `Ошибка синхронизации пользователя ${keycloakUser.email}:`,
        error
      );
      throw new Error(
        `Не удалось синхронизировать пользователя: ${error.message}`
      );
    }
  }

  /**
   * Получает расширенную информацию о пользователе для ответа API
   */
  async getEnrichedUserInfo(keycloakUser: AuthenticatedUser): Promise<{
    keycloak: AuthenticatedUser;
    database: User;
  }> {
    const dbUser = await this.syncUser(keycloakUser);

    return {
      keycloak: keycloakUser,
      database: dbUser,
    };
  }
}
