import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '../../config/config.service.js';

// Используем типы Keycloak API без самописных интерфейсов
// Все типы для наших доменных моделей берем из контрактов
export interface KeycloakUserRepresentation {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
  groups?: string[];
  createdTimestamp?: number;
}

export interface KeycloakGroupRepresentation {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  attributes?: Record<string, string[]>;
  subGroups?: KeycloakGroupRepresentation[];
}

@Injectable()
export class KeycloakIntegrationService {
  private readonly logger = new Logger(KeycloakIntegrationService.name);
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {
    const keycloakConfig = this.configService.auth.keycloak;

    this.axiosInstance = axios.create({
      baseURL: keycloakConfig?.baseUrl || 'http://localhost:8080',
      timeout: keycloakConfig?.timeout || 10000,
    });
  }

  /**
   * Get service account access token
   */
  private async getServiceAccountToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await this.axiosInstance.post(
        `/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: keycloakConfig.serviceAccount.clientId,
          client_secret: keycloakConfig.serviceAccount.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      if (!this.accessToken) {
        throw new Error('Failed to get access token from Keycloak');
      }

      this.logger.debug('Service account token obtained successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Keycloak service account token', error);
      throw new Error('Failed to authenticate with Keycloak');
    }
  }

  /**
   * Get authenticated axios instance
   */
  private async getAuthenticatedAxios(): Promise<AxiosInstance> {
    const token = await this.getServiceAccountToken();

    const instance = axios.create({
      baseURL: this.axiosInstance.defaults.baseURL,
      timeout: this.axiosInstance.defaults.timeout,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Добавляем interceptor для автоматического обновления токена
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.logger.warn('Token expired, attempting to refresh');
          this.accessToken = null;
          this.tokenExpiresAt = 0;

          // Retry once with new token
          const newToken = await this.getServiceAccountToken();
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return axios.request(error.config);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * Get user by Keycloak ID (только чтение)
   */
  async getUserById(
    keycloakId: string
  ): Promise<KeycloakUserRepresentation | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await axios.get(
        `/admin/realms/${keycloakConfig.realm}/users/${keycloakId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get user ${keycloakId}`, error);
      throw error;
    }
  }

  /**
   * Get user by email (только чтение)
   */
  async getUserByEmail(
    email: string
  ): Promise<KeycloakUserRepresentation | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await axios.get(
        `/admin/realms/${keycloakConfig.realm}/users`,
        {
          params: { email, exact: true },
        }
      );

      const users = response.data;
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get user by email ${email}`, error);
      throw error;
    }
  }

  /**
   * Get organization (group) by ID (только чтение)
   */
  async getOrganizationById(
    keycloakId: string
  ): Promise<KeycloakGroupRepresentation | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await axios.get(
        `/admin/realms/${keycloakConfig.realm}/groups/${keycloakId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get organization ${keycloakId}`, error);
      throw error;
    }
  }

  /**
   * Get user's groups/organizations (только чтение)
   */
  async getUserGroups(
    keycloakUserId: string
  ): Promise<KeycloakGroupRepresentation[]> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await axios.get(
        `/admin/realms/${keycloakConfig.realm}/users/${keycloakUserId}/groups`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get user groups for ${keycloakUserId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all organizations (groups) - для админских задач (только чтение)
   */
  async getAllOrganizations(): Promise<KeycloakGroupRepresentation[]> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const response = await axios.get(
        `/admin/realms/${keycloakConfig.realm}/groups`
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get organizations', error);
      throw error;
    }
  }
}
