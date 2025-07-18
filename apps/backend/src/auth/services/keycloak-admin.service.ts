// src/auth/services/keycloak-admin.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AuthConfigService } from '../config/auth-config.service.js';

interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
  credentials?: Array<{
    type: string;
    value: string;
    temporary?: boolean;
  }>;
}

interface KeycloakGroup {
  id?: string;
  name: string;
  path?: string;
  attributes?: Record<string, string[]>;
  realmRoles?: string[];
  subGroups?: KeycloakGroup[];
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly authConfigService: AuthConfigService) {
    this.keycloakUrl =
      this.authConfigService.get('keycloakUrl') || 'http://localhost:8080';
    this.realm = this.authConfigService.get('keycloakRealm') || 'iot-hub';
    this.clientId =
      this.authConfigService.get('keycloakClientId') || 'iot-hub-backend';
    this.clientSecret =
      this.authConfigService.get('keycloakClientSecret') ||
      'iot-hub-backend-secret';
  }

  /**
   * Получает токен доступа для admin API
   */
  private async getAdminToken(): Promise<string> {
    try {
      const response = await fetch(
        `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            scope: 'openid',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get admin token: ${response.status}`);
      }

      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    } catch (error) {
      this.logger.error('Failed to get Keycloak admin token:', error);
      throw new HttpException(
        'Failed to authenticate with Keycloak',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Создает нового пользователя в Keycloak
   */
  async createUser(userData: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    userType: 'personal' | 'enterprise';
    organizationId?: string;
    inviteCode?: string;
  }): Promise<string> {
    const token = await this.getAdminToken();

    const keycloakUser: KeycloakUser = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      enabled: true,
      emailVerified: false,
      attributes: {
        userType: [userData.userType],
        ...(userData.organizationId && {
          organizationId: [userData.organizationId],
        }),
        ...(userData.inviteCode && { inviteCode: [userData.inviteCode] }),
      },
    };

    if (userData.password) {
      keycloakUser.credentials = [
        {
          type: 'password',
          value: userData.password,
          temporary: false,
        },
      ];
    }

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(keycloakUser),
        }
      );

      if (response.status === 201) {
        // Получаем ID созданного пользователя из Location header
        const location = response.headers.get('Location');
        const userId = location?.split('/').pop();

        if (!userId) {
          throw new Error('Failed to get user ID from response');
        }

        this.logger.log(
          `Created user in Keycloak: ${userData.email} (${userId})`
        );
        return userId;
      } else {
        const error = await response.text();
        throw new Error(`Failed to create user: ${response.status} - ${error}`);
      }
    } catch (error) {
      this.logger.error('Failed to create user in Keycloak:', error);
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Создает новую организацию (группу) в Keycloak
   */
  async createOrganization(organizationData: {
    name: string;
    displayName?: string;
    description?: string;
    adminUserId?: string;
  }): Promise<string> {
    const token = await this.getAdminToken();

    const keycloakGroup: KeycloakGroup = {
      name: organizationData.name,
      attributes: {
        type: ['organization'],
        displayName: [organizationData.displayName || organizationData.name],
        ...(organizationData.description && {
          description: [organizationData.description],
        }),
      },
    };

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/groups`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(keycloakGroup),
        }
      );

      if (response.status === 201) {
        const location = response.headers.get('Location');
        const groupId = location?.split('/').pop();

        if (!groupId) {
          throw new Error('Failed to get group ID from response');
        }

        // Если указан администратор, добавляем его в группу с ролью админа
        if (organizationData.adminUserId) {
          await this.addUserToGroup(organizationData.adminUserId, groupId);
          await this.assignRoleToUser(
            organizationData.adminUserId,
            'organization-admin'
          );
        }

        this.logger.log(
          `Created organization in Keycloak: ${organizationData.name} (${groupId})`
        );
        return groupId;
      } else {
        const error = await response.text();
        throw new Error(
          `Failed to create organization: ${response.status} - ${error}`
        );
      }
    } catch (error) {
      this.logger.error('Failed to create organization in Keycloak:', error);
      throw new HttpException(
        'Failed to create organization',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Добавляет пользователя в группу
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/groups/${groupId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to add user to group: ${response.status} - ${error}`
        );
      }

      this.logger.log(`Added user ${userId} to group ${groupId}`);
    } catch (error) {
      this.logger.error('Failed to add user to group:', error);
      throw new HttpException(
        'Failed to add user to group',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Назначает роль пользователю
   */
  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      // Сначала получаем информацию о роли
      const roleResponse = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!roleResponse.ok) {
        throw new Error(`Role ${roleName} not found`);
      }

      const role = await roleResponse.json();

      // Назначаем роль пользователю
      const assignResponse = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([role]),
        }
      );

      if (!assignResponse.ok) {
        const error = await assignResponse.text();
        throw new Error(
          `Failed to assign role: ${assignResponse.status} - ${error}`
        );
      }

      this.logger.log(`Assigned role ${roleName} to user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to assign role to user:', error);
      throw new HttpException(
        'Failed to assign role',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Отправляет приглашение пользователю по email
   */
  async sendInviteEmail(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/send-verify-email`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to send invite email: ${response.status} - ${error}`
        );
      }

      this.logger.log(`Sent invite email to user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to send invite email:', error);
      throw new HttpException(
        'Failed to send invite email',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получает информацию о пользователе из Keycloak
   */
  async getUser(userId: string): Promise<KeycloakUser | null> {
    const token = await this.getAdminToken();

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.status}`);
      }

      return (await response.json()) as KeycloakUser;
    } catch (error) {
      this.logger.error('Failed to get user from Keycloak:', error);
      throw new HttpException(
        'Failed to get user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получает список групп пользователя
   */
  async getUserGroups(userId: string): Promise<KeycloakGroup[]> {
    const token = await this.getAdminToken();

    try {
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/groups`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get user groups: ${response.status}`);
      }

      return (await response.json()) as KeycloakGroup[];
    } catch (error) {
      this.logger.error('Failed to get user groups:', error);
      throw new HttpException(
        'Failed to get user groups',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
