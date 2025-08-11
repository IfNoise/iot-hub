import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, isAxiosError } from 'axios';
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

export interface KeycloakOrganizationRepresentation {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  url?: string;
  enabled: boolean;
  attributes?: Record<string, string[]>;
  domains?: Array<{
    name: string;
    verified: boolean;
  }>;
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
  private tokenExpiresAt = 0; // Принудительно сбрасываем кэш

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

      const url = `/admin/realms/${keycloakConfig.realm}/users/${keycloakId}`;
      this.logger.debug(`Getting user by ID from URL: ${url}`);

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        this.logger.warn(
          `User ${keycloakId} not found in realm ${this.configService.auth.keycloak?.realm}`
        );
        return null;
      }
      this.logger.error(
        `Failed to get user ${keycloakId}`,
        error instanceof Error ? error.message : error
      );
      if (isAxiosError(error)) {
        this.logger.error(
          `HTTP status: ${error.response?.status}, data:`,
          error.response?.data
        );
      }
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
   * Get organization by ID using Organizations API (Keycloak 26+)
   */
  async getOrganizationById(
    keycloakId: string
  ): Promise<KeycloakOrganizationRepresentation | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const url = `/admin/realms/${keycloakConfig.realm}/organizations/${keycloakId}`;
      this.logger.debug(`Getting organization: ${url}`);

      const response = await axios.get(url);
      this.logger.debug(`Successfully got organization: ${keycloakId}`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        this.logger.error(`Failed to get organization ${keycloakId}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          message: error.message,
        });

        if (error.response?.status === 404) {
          this.logger.warn(`Organization not found: ${keycloakId}`);
          return null;
        }
      } else {
        this.logger.error(`Failed to get organization ${keycloakId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
   * Get all organizations - для админских задач (Keycloak 26+)
   */
  async getAllOrganizations(): Promise<KeycloakOrganizationRepresentation[]> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const keycloakConfig = this.configService.auth.keycloak;

      if (!keycloakConfig) {
        throw new Error('Keycloak is not configured');
      }

      const url = `/admin/realms/${keycloakConfig.realm}/organizations`;
      this.logger.debug(`Getting all organizations: ${url}`);

      const response = await axios.get(url);
      return response.data || [];
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        this.logger.error('Failed to get organizations', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          message: error.message,
        });
      } else {
        this.logger.error('Failed to get organizations', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return [];
    }
  }
}
