// src/common/services/keycloak-user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '../types/keycloak-user.interface';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class KeycloakUserService {
  private readonly logger = new Logger(KeycloakUserService.name);

  constructor(private readonly usersService: UsersService) {}

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

      this.logger.log(
        `Пользователь синхронизирован: ${user.email} (${user.id})`
      );

      return user;
    } catch (error) {
      this.logger.error(
        `Ошибка синхронизации пользователя ${keycloakUser.email}:`,
        error
      );
      throw error;
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
