import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { KafkaProducer } from '../infrastructure/kafka/kafka.producer';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UserStatus } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private users: User[] = []; // Временное хранилище, в будущем заменим на БД

  constructor(private readonly kafkaProducer: KafkaProducer) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Проверяем уникальность email
    const existingUser = this.users.find(user => user.email === createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const user: User = {
      id: randomUUID(),
      ...createUserDto,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);

    // Публикуем событие создания пользователя
    await this.kafkaProducer.publishUserCreated({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      role: user.role as 'user' | 'admin' | 'owner', // Приводим к типу из схемы
      createdAt: user.createdAt.toISOString(),
      isActive: user.status === UserStatus.ACTIVE,
    });

    return user;
  }

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    let filteredUsers = this.users;

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredUsers = this.users.filter(
        user =>
          user.email.toLowerCase().includes(searchLower) ||
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredUsers.length;
    const start = (options.page - 1) * options.limit;
    const users = filteredUsers.slice(start, start + options.limit);

    return {
      users,
      total,
      page: options.page,
      limit: options.limit,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = this.users.find(user => user.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Проверяем уникальность email при обновлении
    if (updateUserDto.email) {
      const existingUser = this.users.find(
        user => user.email === updateUserDto.email && user.id !== id
      );
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }
    }

    const previousUser = { ...this.users[userIndex] };
    const updatedUser = {
      ...this.users[userIndex],
      ...updateUserDto,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;

    // Публикуем событие обновления пользователя
    await this.kafkaProducer.publishUserUpdated({
      userId: updatedUser.id,
      previousData: {
        firstName: previousUser.firstName,
        lastName: previousUser.lastName,
        email: previousUser.email,
        role: previousUser.role,
        status: previousUser.status,
      },
      newData: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      },
      updatedBy: updatedUser.id, // В реальном приложении это будет ID текущего пользователя
      updatedAt: updatedUser.updatedAt.toISOString(),
      changes: this.calculateChanges(previousUser, updatedUser),
    });

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = this.users[userIndex];
    this.users.splice(userIndex, 1);

    // Публикуем событие удаления пользователя
    await this.kafkaProducer.publishUserDeleted({
      userId: user.id,
      email: user.email,
      deletedBy: user.id, // В реальном приложении это будет ID текущего пользователя
      deletedAt: new Date().toISOString(),
      hardDelete: true,
      devicesCount: 0, // В реальном приложении нужно будет посчитать количество устройств
    });
  }

  private calculateChanges(previous: User, updated: User): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    
    const fieldsToCheck: (keyof User)[] = ['firstName', 'lastName', 'email', 'role', 'status'];
    
    for (const field of fieldsToCheck) {
      if (previous[field] !== updated[field]) {
        changes.push({
          field,
          oldValue: previous[field],
          newValue: updated[field],
        });
      }
    }
    
    return changes;
  }
}
