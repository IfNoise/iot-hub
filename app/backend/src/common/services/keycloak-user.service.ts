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
      // Ищем пользователя по Keycloak ID
      let user = await this.usersService.findByKeycloakId(keycloakUser.id);

      if (!user) {
        // Если пользователь не найден, создаем нового
        user = await this.usersService.create({
          userId: keycloakUser.id,
          email: keycloakUser.email,
          name: keycloakUser.name,
          avatar: keycloakUser.avatar,
          role: keycloakUser.role,
          balance: 0, // Начальный баланс
          plan: 'free', // Начальный план
        });

        this.logger.log(
          `Создан новый пользователь: ${user.email} (${user.id})`
        );
      } else {
        // Обновляем существующего пользователя, если данные изменились
        const needsUpdate = this.shouldUpdateUser(user, keycloakUser);

        if (needsUpdate) {
          user = await this.usersService.update(user.id, {
            email: keycloakUser.email,
            name: keycloakUser.name,
            avatar: keycloakUser.avatar,
            role: keycloakUser.role,
          });

          this.logger.log(`Обновлен пользователь: ${user.email} (${user.id})`);
        }
      }

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
   * Проверяет, нужно ли обновлять данные пользователя
   */
  private shouldUpdateUser(
    dbUser: User,
    keycloakUser: AuthenticatedUser
  ): boolean {
    return (
      dbUser.email !== keycloakUser.email ||
      dbUser.name !== keycloakUser.name ||
      dbUser.avatar !== keycloakUser.avatar ||
      dbUser.role !== keycloakUser.role
    );
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
