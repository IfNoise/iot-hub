import { Injectable } from '@nestjs/common';
import {
  type Group,
  type GroupMember,
  type CreateGroup,
  type UpdateGroup,
  type GroupQuery,
} from '@iot-hub/acm-contracts';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { groupsTable } from '@iot-hub/shared';
import { eq, and, like, desc, count } from 'drizzle-orm';

@Injectable()
export class GroupsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Создание новой группы
   */
  async create(createRequest: CreateGroup, createdBy: string): Promise<Group> {
    try {
      // Вставляем группу в базу данных
      const [newGroup] = await this.databaseService.db
        .insert(groupsTable as any)
        .values({
          keycloakId: `keycloak-group-${Date.now()}`, // Временное значение для Keycloak ID
          organizationId: createRequest.organizationId,
          name: createRequest.name,
          description: createRequest.description || null,
          createdBy: createRequest.createdBy,
          isActive: createRequest.isActive ?? true,
          parentGroupId: createRequest.parentGroupId || null,
          metadata: createRequest.metadata || {},
        })
        .returning();

      const result: Group = {
        id: (newGroup as any).id,
        name: (newGroup as any).name,
        description: (newGroup as any).description || '',
        organizationId: (newGroup as any).organizationId,
        isActive: true, // По умолчанию активная группа
        createdAt: (newGroup as any).createdAt,
        updatedAt: (newGroup as any).updatedAt,
        createdBy,
        metadata: {},
      };

      console.log('Created new group in database:', result);
      return result;
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create group: ${errorMessage}`);
    }
  }

  /**
   * Получение списка групп с пагинацией и фильтрацией
   */
  async findAll(
    query: GroupQuery
  ): Promise<{ groups: Group[]; total: number; page: number; limit: number }> {
    try {
      const page =
        typeof query.page === 'number'
          ? query.page
          : parseInt(query.page || '1', 10);
      const limit =
        typeof query.limit === 'number'
          ? query.limit
          : parseInt(query.limit || '10', 10);
      const offset = (page - 1) * limit;

      // Строим WHERE условия
      const whereConditions = [];

      if (query.organizationId) {
        whereConditions.push(
          eq((groupsTable as any).organizationId, query.organizationId)
        );
      }

      if (query.search) {
        whereConditions.push(
          like((groupsTable as any).name, `%${query.search}%`)
        );
      }

      // Получаем группы с пагинацией
      const dbGroups = await this.databaseService.db
        .select()
        .from(groupsTable as any)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc((groupsTable as any).createdAt))
        .limit(limit)
        .offset(offset);

      // Получаем общее количество записей
      const [{ totalCount }] = await this.databaseService.db
        .select({ totalCount: count() })
        .from(groupsTable as any)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined
        );

      // Преобразуем результаты в формат контракта
      const result: Group[] = dbGroups.map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description || '',
        organizationId: group.organizationId,
        isActive: true, // Пока что всегда true
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        createdBy: 'current-user-id', // TODO: Сохранять в БД
        metadata: {},
      }));

      return {
        groups: result,
        total: totalCount,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching groupsTable:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch groupsTable: ${errorMessage}`);
    }
  }

  /**
   * Получение группы по ID
   */
  async findOne(id: string): Promise<Group | null> {
    // TODO: Реализовать получение группы из базы данных
    const mockGroup: Group = {
      id,
      name: 'Sample Group',
      description: 'This is a sample group',
      organizationId: 'default-org',
      isActive: true,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
      createdBy: 'admin',
      metadata: { membersCount: 5 },
    };

    return mockGroup;
  }

  /**
   * Обновление группы
   */
  async update(id: string, updateRequest: UpdateGroup): Promise<Group | null> {
    // TODO: Реализовать обновление группы в базе данных
    const updatedGroup: Group = {
      id,
      name: updateRequest.name || 'Updated Group',
      description: updateRequest.description || 'Updated description',
      organizationId: 'default-org',
      isActive: updateRequest.isActive ?? true,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
      createdBy: 'admin',
      metadata: updateRequest.metadata || {},
    };

    console.log('Updating group:', updatedGroup);

    return updatedGroup;
  }

  /**
   * Удаление группы
   */
  async remove(id: string): Promise<boolean> {
    // TODO: Реализовать удаление группы из базы данных
    // Проверить, что группа существует
    // Проверить, что группа не содержит участников (или удалить их)
    // Проверить, что нет дочерних групп

    console.log(`Deleting group ${id}`);

    // Симуляция работы с базой данных
    return true;
  }

  /**
   * Получение участников группы
   */
  async getMembers(
    id: string,
    query: { page?: number; limit?: number }
  ): Promise<{
    members: (GroupMember & {
      user: { id: string; email: string; name: string };
    })[];
    total: number;
    page: number;
    limit: number;
  }> {
    // TODO: Реализовать получение участников из базы данных
    const members = [
      {
        id: 'member-1',
        groupId: id,
        userId: 'user-1',
        role: 'admin' as const,
        joinedAt: new Date(Date.now() - 86400000),
        invitedBy: 'system',
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin User',
        },
      },
      {
        id: 'member-2',
        groupId: id,
        userId: 'user-2',
        role: 'member' as const,
        joinedAt: new Date(Date.now() - 3600000),
        invitedBy: 'user-1',
        user: {
          id: 'user-2',
          email: 'user@example.com',
          name: 'Regular User',
        },
      },
    ];

    return {
      members,
      total: members.length,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  /**
   * Добавление участника в группу
   */
  async addMember(
    groupId: string,
    userId: string,
    role: 'member' | 'admin',
    invitedBy: string
  ): Promise<GroupMember> {
    // TODO: Реализовать добавление участника в базу данных
    // Проверить, что пользователь существует
    // Проверить, что пользователь не является уже участником группы
    // Проверить права на добавление участников

    const newMember: GroupMember = {
      id: `member-${Date.now()}`,
      userId,
      groupId,
      role,
      joinedAt: new Date(),
      invitedBy,
    };

    console.log('Adding member to group:', newMember);

    return newMember;
  }

  /**
   * Обновление роли участника группы
   */
  async updateMemberRole(
    groupId: string,
    userId: string,
    role: 'member' | 'admin'
  ): Promise<GroupMember | null> {
    // TODO: Реализовать обновление роли в базе данных
    const updatedMember: GroupMember = {
      id: 'member-1',
      userId,
      groupId,
      role,
      joinedAt: new Date(Date.now() - 86400000),
      invitedBy: 'system',
    };

    console.log('Updating member role:', updatedMember);

    return updatedMember;
  }

  /**
   * Удаление участника из группы
   */
  async removeMember(groupId: string, userId: string): Promise<boolean> {
    // TODO: Реализовать удаление участника из базы данных
    // Проверить, что участник существует в группе
    // Проверить права на удаление участников

    console.log(`Removing user ${userId} from group ${groupId}`);

    // Симуляция работы с базой данных
    return true;
  }
}
