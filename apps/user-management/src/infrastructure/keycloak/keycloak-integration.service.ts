import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: {
    organizationId?: string[];
    accountType?: string[];
    plan?: string[];
    [key: string]: string[] | undefined;
  };
  groups?: string[];
}

export interface KeycloakOrganization {
  id: string;
  name: string;
  attributes?: {
    slug?: string[];
    plan?: string[];
    maxUsers?: string[];
    maxDevices?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface KeycloakGroup {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  attributes?: {
    organizationId?: string[];
    maxUsers?: string[];
    maxDevices?: string[];
    permissions?: string[];
    [key: string]: string[] | undefined;
  };
  subGroups?: KeycloakGroup[];
}

@Injectable()
export class KeycloakIntegrationService {
  private readonly logger = new Logger(KeycloakIntegrationService.name);
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
      timeout: 10000,
    });
  }

  /**
   * Get admin access token
   */
  private async getAdminToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await this.axiosInstance.post(
        `/admin/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
          client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Keycloak admin token', error);
      throw new Error('Failed to authenticate with Keycloak');
    }
  }

  /**
   * Get authenticated axios instance
   */
  private async getAuthenticatedAxios(): Promise<AxiosInstance> {
    const token = await this.getAdminToken();
    const instance = axios.create({
      baseURL: this.axiosInstance.defaults.baseURL,
      timeout: this.axiosInstance.defaults.timeout,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return instance;
  }

  /**
   * Get user by Keycloak ID
   */
  async getUserById(keycloakId: string): Promise<KeycloakUser | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const response = await axios.get(
        `/admin/realms/${realm}/users/${keycloakId}`
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
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const response = await axios.get(`/admin/realms/${realm}/users`, {
        params: { email, exact: true },
      });

      const users = response.data;
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get user by email ${email}`, error);
      throw error;
    }
  }

  /**
   * Create user in Keycloak
   */
  async createUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    organizationId?: string;
    accountType?: string;
    plan?: string;
    temporaryPassword?: string;
  }): Promise<KeycloakUser> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const keycloakUser = {
        username: userData.email,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        emailVerified: false,
        attributes: {
          organizationId: userData.organizationId
            ? [userData.organizationId]
            : undefined,
          accountType: userData.accountType
            ? [userData.accountType]
            : ['personal'],
          plan: userData.plan ? [userData.plan] : ['free'],
        },
        credentials: userData.temporaryPassword
          ? [
              {
                type: 'password',
                value: userData.temporaryPassword,
                temporary: true,
              },
            ]
          : undefined,
      };

      await axios.post(`/admin/realms/${realm}/users`, keycloakUser);

      // Get the created user
      const createdUser = await this.getUserByEmail(userData.email);
      if (!createdUser) {
        throw new Error('User was created but not found');
      }

      this.logger.log(`User created in Keycloak: ${userData.email}`);
      return createdUser;
    } catch (error) {
      this.logger.error(
        `Failed to create user in Keycloak: ${userData.email}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update user in Keycloak
   */
  async updateUser(
    keycloakId: string,
    userData: {
      firstName?: string;
      lastName?: string;
      organizationId?: string;
      accountType?: string;
      plan?: string;
      enabled?: boolean;
    }
  ): Promise<void> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const updateData: Record<string, unknown> = {};

      if (userData.firstName !== undefined)
        updateData.firstName = userData.firstName;
      if (userData.lastName !== undefined)
        updateData.lastName = userData.lastName;
      if (userData.enabled !== undefined) updateData.enabled = userData.enabled;

      // Update attributes
      if (userData.organizationId || userData.accountType || userData.plan) {
        updateData.attributes = {};
        if (userData.organizationId !== undefined) {
          updateData.attributes.organizationId = userData.organizationId
            ? [userData.organizationId]
            : [];
        }
        if (userData.accountType !== undefined) {
          updateData.attributes.accountType = [userData.accountType];
        }
        if (userData.plan !== undefined) {
          updateData.attributes.plan = [userData.plan];
        }
      }

      await axios.put(`/admin/realms/${realm}/users/${keycloakId}`, updateData);
      this.logger.log(`User updated in Keycloak: ${keycloakId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update user in Keycloak: ${keycloakId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete user from Keycloak
   */
  async deleteUser(keycloakId: string): Promise<void> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      await axios.delete(`/admin/realms/${realm}/users/${keycloakId}`);
      this.logger.log(`User deleted from Keycloak: ${keycloakId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete user from Keycloak: ${keycloakId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get organization (group) by ID
   */
  async getOrganizationById(keycloakId: string): Promise<KeycloakGroup | null> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const response = await axios.get(
        `/admin/realms/${realm}/groups/${keycloakId}`
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
   * Create organization in Keycloak as a group
   */
  async createOrganization(orgData: {
    name: string;
    slug?: string;
    plan?: string;
    maxUsers?: number;
    maxDevices?: number;
  }): Promise<KeycloakGroup> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const groupData = {
        name: orgData.name,
        attributes: {
          slug: orgData.slug ? [orgData.slug] : undefined,
          plan: orgData.plan ? [orgData.plan] : ['free'],
          maxUsers: orgData.maxUsers
            ? [orgData.maxUsers.toString()]
            : undefined,
          maxDevices: orgData.maxDevices
            ? [orgData.maxDevices.toString()]
            : undefined,
          type: ['organization'], // Mark as organization
        },
      };

      await axios.post(`/admin/realms/${realm}/groups`, groupData);

      // Find the created group (Keycloak doesn't return the ID directly)
      const response = await axios.get(`/admin/realms/${realm}/groups`, {
        params: { search: orgData.name },
      });

      const createdGroup = response.data.find(
        (g: KeycloakGroup) => g.name === orgData.name
      );
      if (!createdGroup) {
        throw new Error('Organization was created but not found');
      }

      this.logger.log(`Organization created in Keycloak: ${orgData.name}`);
      return createdGroup;
    } catch (error) {
      this.logger.error(
        `Failed to create organization in Keycloak: ${orgData.name}`,
        error
      );
      throw error;
    }
  }

  /**
   * Add user to organization/group
   */
  async addUserToOrganization(
    keycloakUserId: string,
    keycloakGroupId: string
  ): Promise<void> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      await axios.put(
        `/admin/realms/${realm}/users/${keycloakUserId}/groups/${keycloakGroupId}`
      );
      this.logger.log(
        `User ${keycloakUserId} added to organization ${keycloakGroupId}`
      );
    } catch (error) {
      this.logger.error(`Failed to add user to organization`, error);
      throw error;
    }
  }

  /**
   * Remove user from organization/group
   */
  async removeUserFromOrganization(
    keycloakUserId: string,
    keycloakGroupId: string
  ): Promise<void> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      await axios.delete(
        `/admin/realms/${realm}/users/${keycloakUserId}/groups/${keycloakGroupId}`
      );
      this.logger.log(
        `User ${keycloakUserId} removed from organization ${keycloakGroupId}`
      );
    } catch (error) {
      this.logger.error(`Failed to remove user from organization`, error);
      throw error;
    }
  }

  /**
   * Get user's groups/organizations
   */
  async getUserGroups(keycloakUserId: string): Promise<KeycloakGroup[]> {
    try {
      const axios = await this.getAuthenticatedAxios();
      const realm = process.env.KEYCLOAK_REALM || 'iot-hub';

      const response = await axios.get(
        `/admin/realms/${realm}/users/${keycloakUserId}/groups`
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
}
