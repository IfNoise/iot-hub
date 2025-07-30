import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DatabaseService } from '../infrastructure/database/database.service';
import { KeycloakIntegrationService } from '../infrastructure/keycloak/keycloak-integration.service';
import { KafkaProducer } from '../infrastructure/kafka/kafka.producer';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UserStatus } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { 
  users, 
  organizations, 
  userGroups,
  type User as DbUser,
  type NewUser,
  type Organization as DbOrganization
} from '../infrastructure/database/schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly keycloakService: KeycloakIntegrationService,
    private readonly kafkaProducer: KafkaProducer
  ) {}

  /**
   * Create a new user (both in Keycloak and local DB)
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, firstName, lastName, organizationId, role } = createUserDto;

    this.logger.log(`Creating user: ${email}`);

    // Check if user already exists locally
    const existingUser = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization exists (if provided)
    let organization: DbOrganization | null = null;
    if (organizationId) {
      const orgResult = await this.databaseService.db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
        .limit(1);

      if (orgResult.length === 0) {
        throw new BadRequestException('Organization not found');
      }
      organization = orgResult[0];

      // Check organization user limits
      if (organization.currentUserCount >= organization.maxUsers) {
        throw new BadRequestException('Organization has reached maximum user limit');
      }
    }

    try {
      // Create user in Keycloak first
      const keycloakUser = await this.keycloakService.createUser({
        email,
        firstName,
        lastName,
        organizationId,
        accountType: organizationId ? 'organization' : 'personal',
        plan: organization?.plan || 'free',
      });

      // Create user in local database
      const newUser: NewUser = {
        keycloakId: keycloakUser.id,
        email,
        firstName,
        lastName,
        organizationId,
        accountType: organizationId ? 'organization' : 'personal',
        status: 'active',
        plan: organization?.plan || 'free',
        deviceLimit: this.getDeviceLimitForPlan(organization?.plan || 'free'),
      };

      const [createdUser] = await this.databaseService.db
        .insert(users)
        .values(newUser)
        .returning();

      // Update organization user count if applicable
      if (organizationId) {
        await this.databaseService.db
          .update(organizations)
          .set({ 
            currentUserCount: organization!.currentUserCount + 1,
            updatedAt: new Date()
          })
          .where(eq(organizations.id, organizationId));

        // Add user to organization group in Keycloak
        if (organization) {
          const keycloakOrg = await this.keycloakService.getOrganizationById(organization.keycloakId);
          if (keycloakOrg) {
            await this.keycloakService.addUserToOrganization(keycloakUser.id, keycloakOrg.id);
          }
        }
      }

      // Publish user created event
      await this.kafkaProducer.publishUserCreated({
        userId: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName || '',
        lastName: createdUser.lastName || '',
        organizationId: createdUser.organizationId || '',
        role: role as 'user' | 'admin' | 'owner',
        createdAt: createdUser.createdAt.toISOString(),
        isActive: createdUser.status === 'active',
      });

      this.logger.log(`User created successfully: ${createdUser.id}`);
      return this.mapDbUserToEntity(createdUser);

    } catch (error) {
      this.logger.error(`Failed to create user: ${email}`, error);
      
      // Cleanup: try to delete from Keycloak if local DB creation failed
      if (error instanceof Error && error.message.includes('keycloak')) {
        // Keycloak creation failed, nothing to clean up
        throw error;
      } else {
        // Local DB creation failed, try to cleanup Keycloak
        try {
          const keycloakUser = await this.keycloakService.getUserByEmail(email);
          if (keycloakUser) {
            await this.keycloakService.deleteUser(keycloakUser.id);
          }
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup Keycloak user after local DB error', cleanupError);
        }
        throw error;
      }
    }
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(filters?: {
    organizationId?: string;
    status?: UserStatus;
    plan?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { organizationId, status, plan, limit = 50, offset = 0 } = filters || {};

    let query = this.databaseService.db
      .select()
      .from(users)
      .where(isNull(users.deletedAt));

    // Apply filters
    const conditions = [isNull(users.deletedAt)];
    
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }
    
    if (status) {
      conditions.push(eq(users.status, status));
    }
    
    if (plan) {
      conditions.push(eq(users.plan, plan));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    const [{ count }] = await this.databaseService.db
      .select({ count: users.id })
      .from(users)
      .where(whereCondition);

    // Get users with pagination
    const dbUsers = await this.databaseService.db
      .select()
      .from(users)
      .where(whereCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt);

    return {
      users: dbUsers.map(user => this.mapDbUserToEntity(user)),
      total: Number(count) || 0,
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string): Promise<User> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapDbUserToEntity(user);
  }

  /**
   * Get user by Keycloak ID
   */
  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.keycloakId, keycloakId), isNull(users.deletedAt)))
      .limit(1);

    return user ? this.mapDbUserToEntity(user) : null;
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    const { firstName, lastName, status, plan } = updateUserDto;

    this.logger.log(`Updating user: ${id}`);

    try {
      // Update in Keycloak
      await this.keycloakService.updateUser(user.keycloakId, {
        firstName,
        lastName,
        enabled: status !== 'suspended',
        plan,
      });

      // Update in local database
      const updateData: Partial<NewUser> = {
        updatedAt: new Date(),
      };

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (status !== undefined) updateData.status = status;
      if (plan !== undefined) {
        updateData.plan = plan;
        updateData.deviceLimit = this.getDeviceLimitForPlan(plan);
      }

      const [updatedUser] = await this.databaseService.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      // Publish user updated event
      await this.kafkaProducer.publishUserUpdated({
        userId: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        organizationId: updatedUser.organizationId || '',
        isActive: updatedUser.status === 'active',
        updatedAt: updatedUser.updatedAt.toISOString(),
        changes: Object.keys(updateData),
      });

      this.logger.log(`User updated successfully: ${id}`);
      return this.mapDbUserToEntity(updatedUser);

    } catch (error) {
      this.logger.error(`Failed to update user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    this.logger.log(`Deleting user: ${id}`);

    try {
      // Soft delete in local database first
      await this.databaseService.db
        .update(users)
        .set({ 
          deletedAt: new Date(),
          status: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(users.id, id));

      // Delete from Keycloak
      await this.keycloakService.deleteUser(user.keycloakId);

      // Update organization user count if applicable
      if (user.organizationId) {
        await this.databaseService.db
          .update(organizations)
          .set({ 
            currentUserCount: organizations.currentUserCount - 1,
            updatedAt: new Date()
          })
          .where(eq(organizations.id, user.organizationId));
      }

      // Publish user deleted event
      await this.kafkaProducer.publishUserDeleted({
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId || '',
        deletedAt: new Date().toISOString(),
      });

      this.logger.log(`User deleted successfully: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to delete user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Sync user from Keycloak (for auto-sync middleware)
   */
  async syncUserFromKeycloak(keycloakId: string): Promise<User> {
    const keycloakUser = await this.keycloakService.getUserById(keycloakId);
    if (!keycloakUser) {
      throw new NotFoundException(`Keycloak user ${keycloakId} not found`);
    }

    // Check if user exists locally
    let localUser = await this.findByKeycloakId(keycloakId);

    if (localUser) {
      // Update existing user
      const updateData: Partial<NewUser> = {
        email: keycloakUser.email,
        firstName: keycloakUser.firstName,
        lastName: keycloakUser.lastName,
        status: keycloakUser.enabled ? 'active' : 'inactive',
        plan: keycloakUser.attributes?.plan?.[0] || 'free',
        updatedAt: new Date(),
      };

      const [updatedUser] = await this.databaseService.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, localUser.id))
        .returning();

      return this.mapDbUserToEntity(updatedUser);
    } else {
      // Create new user from Keycloak data
      const newUser: NewUser = {
        keycloakId: keycloakUser.id,
        email: keycloakUser.email,
        firstName: keycloakUser.firstName,
        lastName: keycloakUser.lastName,
        organizationId: keycloakUser.attributes?.organizationId?.[0] || null,
        accountType: keycloakUser.attributes?.accountType?.[0] as 'personal' | 'organization' || 'personal',
        status: keycloakUser.enabled ? 'active' : 'inactive',
        plan: keycloakUser.attributes?.plan?.[0] || 'free',
        deviceLimit: this.getDeviceLimitForPlan(keycloakUser.attributes?.plan?.[0] || 'free'),
      };

      const [createdUser] = await this.databaseService.db
        .insert(users)
        .values(newUser)
        .returning();

      return this.mapDbUserToEntity(createdUser);
    }
  }

  /**
   * Map database user to entity
   */
  private mapDbUserToEntity(dbUser: DbUser): User {
    return {
      id: dbUser.id,
      keycloakId: dbUser.keycloakId,
      email: dbUser.email,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      organizationId: dbUser.organizationId || '',
      role: 'user', // Default role, real roles come from Keycloak
      status: dbUser.status as UserStatus,
      plan: dbUser.plan,
      balance: parseFloat(dbUser.balance || '0'),
      deviceLimit: dbUser.deviceLimit || 5,
      currentDeviceCount: dbUser.currentDeviceCount || 0,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }

  /**
   * Get device limit based on plan
   */
  private getDeviceLimitForPlan(plan: string): number {
    switch (plan) {
      case 'free': return 5;
      case 'pro': return 50;
      case 'enterprise': return 1000;
      default: return 5;
    }
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
        (user) =>
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
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Проверяем уникальность email при обновлении
    if (updateUserDto.email) {
      const existingUser = this.users.find(
        (user) => user.email === updateUserDto.email && user.id !== id
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
    const userIndex = this.users.findIndex((user) => user.id === id);
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

  private calculateChanges(
    previous: User,
    updated: User
  ): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    const fieldsToCheck: (keyof User)[] = [
      'firstName',
      'lastName',
      'email',
      'role',
      'status',
    ];

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
