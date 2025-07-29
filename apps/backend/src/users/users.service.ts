import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User as DbUser } from './entities/user.entity.js';

import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { userDtoToEntity } from './mappers/dto-to-entity.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(DbUser)
    private readonly userRepository: Repository<DbUser>
  ) {}

  /**
   * Создание нового пользователя
   */
  async create(createUserDto: CreateUserDto): Promise<DbUser> {
    const entity = userDtoToEntity(createUserDto);
    const user = this.userRepository.create(entity);
    return await this.userRepository.save(user);
  }

  /**
   * Получение всех пользователей
   */
  async findAll(): Promise<DbUser[]> {
    return await this.userRepository.find();
  }

  /**
   * Получение пользователя по ID
   */
  async findOne(id: string): Promise<DbUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Получение пользователя по email
   */
  async findByEmail(email: string): Promise<DbUser | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Получение пользователя по Keycloak ID (userId)
   */
  async findByKeycloakId(userId: string): Promise<DbUser | null> {
    return await this.userRepository.findOne({ where: { userId } });
  }

  /**
   * Создание нового пользователя или обновление существующего
   * Использует upsert подход для атомарной операции
   */
  async createOrUpdate(
    userId: string,
    userData: Partial<CreateUserDto>
  ): Promise<DbUser> {
    const existingUser = await this.findByKeycloakId(userId);

    if (existingUser) {
      // Обновляем существующего пользователя только если данные изменились
      const needsUpdate = this.shouldUpdateUser(existingUser, userData);

      if (needsUpdate) {
        // Обновляем только разрешённые поля
        if (userData.email) existingUser.email = userData.email;
        if (userData.name) existingUser.name = userData.name;
        if (userData.avatar !== undefined)
          existingUser.avatar = userData.avatar;
        if (userData.roles) existingUser.roles = userData.roles;
        if (userData.accountType)
          existingUser.accountType = userData.accountType;
        if (userData.organizationId !== undefined)
          existingUser.keycloakOrganizationId = userData.organizationId || undefined;
        if (userData.groups !== undefined)
          existingUser.groups = userData.groups;
        if (userData.metadata !== undefined)
          existingUser.metadata = userData.metadata;
        return await this.userRepository.save(existingUser);
      }
      return existingUser;
    }

    // Создаем нового пользователя
    const entity = userDtoToEntity({
      userId,
      ...userData,
      balance: userData.balance ?? 0,
      plan: userData.plan ?? 'free',
      organizationId: userData.organizationId ?? undefined,
    } as CreateUserDto);
    const newUser = this.userRepository.create(entity);
    return await this.userRepository.save(newUser);
  }

  /**
   * Проверяет, нужно ли обновлять данные пользователя
   */
  private shouldUpdateUser(
    dbUser: DbUser,
    updateData: Partial<CreateUserDto>
  ): boolean {
    return !!(
      (updateData.email && dbUser.email !== updateData.email) ||
      (updateData.name && dbUser.name !== updateData.name) ||
      (updateData.avatar && dbUser.avatar !== updateData.avatar) ||
      (updateData.roles &&
        JSON.stringify(dbUser.roles) !== JSON.stringify(updateData.roles)) ||
      (updateData.accountType &&
        dbUser.accountType !== updateData.accountType) ||
      (updateData.organizationId &&
        dbUser.keycloakOrganizationId !== updateData.organizationId) ||
      (updateData.groups &&
        JSON.stringify(dbUser.groups) !== JSON.stringify(updateData.groups))
    );
  }

  /**
   * Обновление пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<DbUser> {
    const user = await this.findOne(id);
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.avatar !== undefined) user.avatar = updateUserDto.avatar;
    if (updateUserDto.roles) user.roles = updateUserDto.roles;
    if (updateUserDto.accountType) user.accountType = updateUserDto.accountType;
    if (updateUserDto.organizationId !== undefined)
      user.keycloakOrganizationId = updateUserDto.organizationId || undefined;
    if (updateUserDto.groups !== undefined) user.groups = updateUserDto.groups;
    if (updateUserDto.metadata !== undefined)
      user.metadata = updateUserDto.metadata;
    return await this.userRepository.save(user);
  }

  /**
   * Удаление пользователя
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  /**
   * Обновление баланса пользователя
   */
  async updateBalance(id: string, amount: number): Promise<DbUser> {
    const user = await this.findOne(id);
    user.balance = amount;
    return await this.userRepository.save(user);
  }

  /**
   * Обновление плана пользователя
   */
  async updatePlan(
    id: string,
    plan: 'free' | 'pro' | 'enterprise',
    expiresAt?: Date
  ): Promise<DbUser> {
    const user = await this.findOne(id);
    user.plan = plan;
    if (expiresAt) {
      user.planExpiresAt = expiresAt;
    }
    return await this.userRepository.save(user);
  }
}
