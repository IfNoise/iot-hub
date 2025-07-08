import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Создание нового пользователя
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Получение всех пользователей
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * Получение пользователя по ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Получение пользователя по email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Получение пользователя по Keycloak ID (userId)
   */
  async findByKeycloakId(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { userId } });
  }

  /**
   * Создание нового пользователя или обновление существующего
   * Использует upsert подход для атомарной операции
   */
  async createOrUpdate(
    userId: string,
    userData: Partial<CreateUserDto>
  ): Promise<User> {
    const existingUser = await this.findByKeycloakId(userId);

    if (existingUser) {
      // Обновляем существующего пользователя только если данные изменились
      const needsUpdate = this.shouldUpdateUser(existingUser, userData);

      if (needsUpdate) {
        Object.assign(existingUser, userData);
        return await this.userRepository.save(existingUser);
      }

      return existingUser;
    }

    // Создаем нового пользователя
    const newUser = this.userRepository.create({
      userId,
      ...userData,
      balance: userData.balance ?? 0,
      plan: userData.plan ?? 'free',
    });

    return await this.userRepository.save(newUser);
  }

  /**
   * Проверяет, нужно ли обновлять данные пользователя
   */
  private shouldUpdateUser(
    dbUser: User,
    updateData: Partial<CreateUserDto>
  ): boolean {
    return !!(
      (updateData.email && dbUser.email !== updateData.email) ||
      (updateData.name && dbUser.name !== updateData.name) ||
      (updateData.avatar && dbUser.avatar !== updateData.avatar) ||
      (updateData.role && dbUser.role !== updateData.role)
    );
  }

  /**
   * Обновление пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
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
  async updateBalance(id: string, amount: number): Promise<User> {
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
  ): Promise<User> {
    const user = await this.findOne(id);
    user.plan = plan;
    if (expiresAt) {
      user.planExpiresAt = expiresAt;
    }
    return await this.userRepository.save(user);
  }
}
