import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../users/entities/organization.entity.js';
import {
  CreateOrganization,
  UpdateOrganization,
  OrganizationQuery,
} from '@iot-hub/users';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>
  ) {}

  async create(dto: CreateOrganization): Promise<Organization> {
    // Проверяем уникальность имени
    const existingOrg = await this.organizationRepo.findOne({
      where: { name: dto.name },
    });

    if (existingOrg) {
      throw new ConflictException(
        `Organization with name "${dto.name}" already exists`
      );
    }

    const organization = this.organizationRepo.create(dto);
    return await this.organizationRepo.save(organization);
  }

  async findAll(query: OrganizationQuery) {
    const qb = this.organizationRepo.createQueryBuilder('org');

    if (query.search) {
      qb.where('org.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('org.isActive = :isActive', { isActive: query.isActive });
    }

    const total = await qb.getCount();
    const organizations = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      organizations,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationRepo.findOne({
      where: { id },
      relations: ['users', 'groups', 'devices'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganization): Promise<Organization> {
    const organization = await this.findById(id);

    if (dto.name && dto.name !== organization.name) {
      const existingOrg = await this.organizationRepo.findOne({
        where: { name: dto.name },
      });

      if (existingOrg && existingOrg.id !== id) {
        throw new ConflictException(
          `Organization with name "${dto.name}" already exists`
        );
      }
    }

    Object.assign(organization, dto);
    return await this.organizationRepo.save(organization);
  }

  async delete(id: string): Promise<void> {
    const organization = await this.findById(id);
    await this.organizationRepo.remove(organization);
  }

  async getUserCount(organizationId: string): Promise<number> {
    return await this.organizationRepo
      .createQueryBuilder('org')
      .leftJoin('org.users', 'user')
      .where('org.id = :organizationId', { organizationId })
      .getCount();
  }

  async getDeviceCount(organizationId: string): Promise<number> {
    return await this.organizationRepo
      .createQueryBuilder('org')
      .leftJoin('org.devices', 'device')
      .where('org.id = :organizationId', { organizationId })
      .getCount();
  }
}
