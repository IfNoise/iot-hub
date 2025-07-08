import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../users/entities/group.entity.js';
import { Organization } from '../users/entities/organization.entity.js';
import { CreateGroup, UpdateGroup, GroupQuery } from '@iot-hub/users';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>
  ) {}

  async create(dto: CreateGroup): Promise<Group> {
    // Проверяем существование организации
    const organization = await this.organizationRepo.findOne({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID "${dto.organizationId}" not found`
      );
    }

    // Проверяем уникальность имени группы в рамках организации
    const existingGroup = await this.groupRepo.findOne({
      where: {
        name: dto.name,
        organizationId: dto.organizationId,
      },
    });

    if (existingGroup) {
      throw new ConflictException(
        `Group with name "${dto.name}" already exists in this organization`
      );
    }

    // Если указана родительская группа, проверяем её существование
    if (dto.parentGroupId) {
      const parentGroup = await this.groupRepo.findOne({
        where: {
          id: dto.parentGroupId,
          organizationId: dto.organizationId,
        },
      });

      if (!parentGroup) {
        throw new NotFoundException(
          `Parent group with ID "${dto.parentGroupId}" not found`
        );
      }

      // Проверяем на циклические ссылки
      await this.validateNoCircularReference(
        dto.parentGroupId,
        dto.organizationId
      );
    }

    const group = this.groupRepo.create(dto);
    return await this.groupRepo.save(group);
  }

  async findAll(query: GroupQuery) {
    const qb = this.groupRepo.createQueryBuilder('group');

    if (query.organizationId) {
      qb.where('group.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }

    if (query.parentGroupId !== undefined) {
      if (query.parentGroupId === null) {
        qb.andWhere('group.parentGroupId IS NULL');
      } else {
        qb.andWhere('group.parentGroupId = :parentGroupId', {
          parentGroupId: query.parentGroupId,
        });
      }
    }

    if (query.search) {
      qb.andWhere('group.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('group.isActive = :isActive', { isActive: query.isActive });
    }

    const total = await qb.getCount();
    const groups = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .leftJoinAndSelect('group.organization', 'organization')
      .leftJoinAndSelect('group.parentGroup', 'parentGroup')
      .getMany();

    return {
      groups,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: [
        'organization',
        'parentGroup',
        'childGroups',
        'users',
        'devices',
      ],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    return group;
  }

  async update(id: string, dto: UpdateGroup): Promise<Group> {
    const group = await this.findById(id);

    // Проверяем уникальность имени в рамках организации
    if (dto.name && dto.name !== group.name) {
      const existingGroup = await this.groupRepo.findOne({
        where: {
          name: dto.name,
          organizationId: group.organizationId,
        },
      });

      if (existingGroup && existingGroup.id !== id) {
        throw new ConflictException(
          `Group with name "${dto.name}" already exists in this organization`
        );
      }
    }

    // Проверяем родительскую группу
    if (dto.parentGroupId !== undefined) {
      if (dto.parentGroupId === id) {
        throw new BadRequestException('Group cannot be its own parent');
      }

      if (dto.parentGroupId) {
        const parentGroup = await this.groupRepo.findOne({
          where: {
            id: dto.parentGroupId,
            organizationId: group.organizationId,
          },
        });

        if (!parentGroup) {
          throw new NotFoundException(
            `Parent group with ID "${dto.parentGroupId}" not found`
          );
        }

        // Проверяем на циклические ссылки
        await this.validateNoCircularReference(
          dto.parentGroupId,
          group.organizationId,
          id
        );
      }
    }

    Object.assign(group, dto);
    return await this.groupRepo.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.findById(id);
    await this.groupRepo.remove(group);
  }  /**
   * Получить устройства группы
   */
  async getGroupDevices(groupId: string, query: Record<string, unknown>): Promise<{
    devices: Array<{
      deviceId: string;
      model: string;
      status: 'unbound' | 'bound' | 'revoked';
      lastSeenAt: string;
      boundAt: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.findById(groupId);
    
    // TODO: Реализовать получение устройств группы
    // Заглушка для совместимости с контрактом
    return {
      devices: [],
      total: 0,
      page: (query.page as number) || 1,
      limit: (query.limit as number) || 10,
      totalPages: 0,
    };
  }

  /**
   * Получить пользователей группы
   */
  async getGroupUsers(groupId: string, query: Record<string, unknown>): Promise<{
    users: Array<{
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user' | 'org_admin' | 'group_admin';
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.findById(groupId);
    
    // TODO: Реализовать получение пользователей группы
    // Заглушка для совместимости с контрактом
    return {
      users: [],
      total: 0,
      page: (query.page as number) || 1,
      limit: (query.limit as number) || 10,
      totalPages: 0,
    };
  }

  private async validateNoCircularReference(
    parentGroupId: string,
    organizationId: string,
    excludeGroupId?: string
  ): Promise<void> {
    const visited = new Set<string>();
    let currentGroupId: string | null = parentGroupId;

    while (currentGroupId) {
      if (excludeGroupId && currentGroupId === excludeGroupId) {
        throw new BadRequestException(
          'Circular reference detected in group hierarchy'
        );
      }

      if (visited.has(currentGroupId)) {
        throw new BadRequestException(
          'Circular reference detected in group hierarchy'
        );
      }

      visited.add(currentGroupId);

      const currentGroup = await this.groupRepo.findOne({
        where: { id: currentGroupId, organizationId },
        select: ['parentGroupId'],
      });

      if (!currentGroup) {
        break;
      }

      currentGroupId = currentGroup.parentGroupId ?? null;
    }
  }
}
