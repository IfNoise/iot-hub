import { Injectable, Logger } from '@nestjs/common';
import {
  type Organization,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '@iot-hub/acm-contracts';
import type { z } from 'zod';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { organizationsTable, eq } from '@iot-hub/shared';

type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}
  async createOrganization(
    input: CreateOrganizationInput
  ): Promise<Organization> {
    // Временная заглушка - просто возвращаем mock объект
    const mockOrganization: Organization = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: input.name,
      description: input.description || '',
      logo: undefined,
      domain: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: input.metadata || {},
    };

    return mockOrganization;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    organizations: Organization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    try {
      // Получаем организации с пагинацией
      const dbOrganizations = await this.databaseService.db
        .select()
        .from(organizationsTable)
        .limit(limit)
        .offset(offset);

      // Получаем общее количество
      const totalCountResult = await this.databaseService.db
        .select()
        .from(organizationsTable);
      const total = totalCountResult.length;

      // Конвертируем в формат Organization
      const organizations: Organization[] = dbOrganizations.map((org) => ({
        id: org.keycloakId, // Используем keycloakId как внешний ID
        name: org.name,
        description: org.description || undefined,
        logo: undefined,
        domain: undefined,
        isActive: true,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        metadata: org.metadata || {},
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        organizations,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch organizations: ${error}`);
      return {
        organizations: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  async findById(_id: string): Promise<Organization | null> {
    // Временная заглушка
    return null;
  }

  async findOne(id: string): Promise<Organization | null> {
    return this.findById(id);
  }

  async update(
    id: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    // Временная заглушка
    const mockOrganization: Organization = {
      id,
      name: input.name || 'Updated Organization',
      description: input.description || '',
      logo: undefined,
      domain: undefined,
      isActive: input.isActive !== undefined ? input.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: input.metadata || {},
    };
    return mockOrganization;
  }

  async remove(_id: string): Promise<boolean> {
    // Временная заглушка - всегда успешно
    return true;
  }

  async syncOrganizationFromRegisterEvent(
    eventData: Record<string, unknown>
  ): Promise<Organization> {
    // Извлекаем данные из события регистрации
    const organizationId = eventData.organizationId as string;
    const name = (eventData.organizationName as string) || 'New Organization';
    const ownerId = eventData.ownerId as string;

    // Создаем объект организации из события регистрации
    const organization: Organization = {
      id: organizationId,
      name: name,
      description: `Organization created from user registration`,
      logo: undefined,
      domain: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ownerId: ownerId,
        createdFromRegistration: true,
        syncedAt: new Date().toISOString(),
      },
    };

    this.logger.log(
      `Synced organization from registration event: ${organizationId} (${name})`
    );

    return organization;
  }

  async syncFromKeycloakEvent(
    eventData: Record<string, unknown>
  ): Promise<Organization> {
    // Извлекаем данные из события
    const organizationId = eventData.keycloakId as string;
    const name = eventData.name as string;
    const displayName = eventData.displayName as string;
    const domain = eventData.domain as string | undefined;
    const ownerId = eventData.ownerId as string;
    const isEnabled = eventData.isEnabled as boolean;

    try {
      // Проверяем, существует ли организация
      const existingOrgs = await this.databaseService.db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.keycloakId, organizationId));

      if (existingOrgs.length > 0) {
        // Организация уже существует, возвращаем её
        const existingOrg = existingOrgs[0];
        this.logger.log(
          `Organization already exists: ${organizationId} (${name})`
        );

        return {
          id: existingOrg.keycloakId,
          name: existingOrg.name,
          description: existingOrg.description || undefined,
          logo: undefined,
          domain: existingOrg.slug || undefined,
          isActive: true,
          createdAt: existingOrg.createdAt,
          updatedAt: existingOrg.updatedAt,
          metadata: existingOrg.metadata || {},
        };
      }

      // Создаем slug из имени
      const slug = (displayName || name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');

      // Создаем новую организацию в базе данных
      const [createdOrg] = await this.databaseService.db
        .insert(organizationsTable)
        .values({
          keycloakId: organizationId,
          name: displayName || name,
          slug: slug,
          description: `Organization synced from Keycloak`,
          plan: 'free',
          metadata: {
            keycloakId: organizationId,
            ownerId: ownerId,
            syncedFromKeycloak: true,
            syncedAt: new Date().toISOString(),
          },
        })
        .returning();

      this.logger.log(
        `Created organization from Keycloak event: ${organizationId} (${name})`
      );

      // Возвращаем созданную организацию в формате Organization
      return {
        id: createdOrg.keycloakId,
        name: createdOrg.name,
        description: createdOrg.description || undefined,
        logo: undefined,
        domain: createdOrg.slug || undefined,
        isActive: true,
        createdAt: createdOrg.createdAt,
        updatedAt: createdOrg.updatedAt,
        metadata: createdOrg.metadata || {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync organization from Keycloak: ${organizationId} - ${error}`
      );

      // В случае ошибки возвращаем временную организацию
      return {
        id: organizationId,
        name: displayName || name,
        description: `Organization synced from Keycloak (not persisted)`,
        logo: undefined,
        domain: domain,
        isActive: isEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          keycloakId: organizationId,
          ownerId: ownerId,
          syncedFromKeycloak: true,
          syncedAt: new Date().toISOString(),
          error: String(error),
        },
      };
    }
  }
}
