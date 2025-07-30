import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { type User, type CreateUser, type UpdateUser } from '@iot-hub/users';
import { DatabaseService } from '../infrastructure/database/database.service';
import { KeycloakIntegrationService } from '../infrastructure/keycloak/keycloak-integration.service';
import { KafkaProducer } from '../infrastructure/kafka/kafka.producer';
import {
  users,
  type InsertUser,
  type SelectUser,
} from '../infrastructure/database/schema';
import { eq, and, isNull, like, or, count } from 'drizzle-orm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly keycloakService: KeycloakIntegrationService,
    private readonly kafkaProducer: KafkaProducer
  ) {}

  /**
   * Create new user in both Keycloak and local database
   */
  async create(createUserDto: CreateUser): Promise<User> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    try {
      // 1. Create user in Keycloak first
      const keycloakUser = await this.keycloakService.createUser({
        email: createUserDto.email,
        name: createUserDto.name,
        password: createUserDto.password, // This will be handled securely by Keycloak
        roles: createUserDto.roles || ['personal-user'],
      });

      // 2. Store user in local database with Keycloak reference
      const dbUser: InsertUser = {
        userId: keycloakUser.id, // Use Keycloak ID
        email: createUserDto.email,
        name: createUserDto.name,
        avatar: createUserDto.avatar,
        balance: createUserDto.balance?.toString() || '0.00',
        plan: createUserDto.plan || 'free',
        planExpiresAt: createUserDto.planExpiresAt,
        accountType: createUserDto.type || 'individual',
        organizationId: createUserDto.organizationId,
        groups: createUserDto.groups || [],
        deviceLimit: this.getDeviceLimitByPlan(createUserDto.plan || 'free'),
        metadata: createUserDto.metadata || {},
      };

      const [insertedUser] = await this.databaseService.db
        .insert(users)
        .values(dbUser)
        .returning();

      // 3. Convert to contract format
      const userResult = this.mapDbUserToContract(
        insertedUser,
        keycloakUser.roles
      );

      // 4. Publish user created event
      await this.kafkaProducer.publishUserCreated({
        userId: userResult.id,
        email: userResult.email,
        name: userResult.name,
        organizationId: userResult.organizationId,
        plan: userResult.plan,
        accountType: userResult.type,
        groups: userResult.groups,
      });

      // 5. Return user
      return userResult;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);

      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  /**
   * Get users with pagination and filtering
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
    plan?: string;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const { page, limit, search, organizationId, plan } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [isNull(users.deletedAt)];

    if (search) {
      conditions.push(
        or(like(users.email, `%${search}%`), like(users.name, `%${search}%`))
      );
    }

    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }

    if (plan) {
      conditions.push(eq(users.plan, plan));
    }

    const whereCondition =
      conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    const [{ count: totalCount }] = await this.databaseService.db
      .select({ count: count() })
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

    // Get roles from Keycloak for each user
    const usersWithRoles = await Promise.all(
      dbUsers.map(async (dbUser) => {
        try {
          const keycloakUser = await this.keycloakService.getUser(
            dbUser.userId
          );
          return this.mapDbUserToContract(dbUser, keycloakUser.roles);
        } catch (error) {
          this.logger.warn(
            `Failed to get Keycloak data for user ${dbUser.userId}: ${error.message}`
          );
          return this.mapDbUserToContract(dbUser, ['personal-user']); // fallback role
        }
      })
    );

    return {
      users: usersWithRoles,
      total: Number(totalCount) || 0,
      page,
      limit,
    };
  }

  /**
   * Get user by ID (Keycloak ID)
   */
  async findOne(userId: string): Promise<User> {
    this.logger.log(`Finding user by ID: ${userId}`);

    const [dbUser] = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.userId, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get fresh data from Keycloak for roles and other dynamic data
    const keycloakUser = await this.keycloakService.getUser(userId);

    return this.mapDbUserToContract(dbUser, keycloakUser.roles);
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);

    const [dbUser] = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!dbUser) {
      return null;
    }

    const keycloakUser = await this.keycloakService.getUser(dbUser.userId);
    return this.mapDbUserToContract(dbUser, keycloakUser.roles);
  }

  /**
   * Update user data
   */
  async update(userId: string, updateUserDto: UpdateUser): Promise<User> {
    this.logger.log(`Updating user: ${userId}`);

    // Check if user exists
    await this.findOne(userId);

    // Update in Keycloak if needed
    if (updateUserDto.name || updateUserDto.roles) {
      await this.keycloakService.updateUser(userId, {
        name: updateUserDto.name,
        roles: updateUserDto.roles,
      });
    }

    // Update in local database
    const updateData: Partial<InsertUser> = {};

    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.avatar !== undefined)
      updateData.avatar = updateUserDto.avatar;
    if (updateUserDto.balance !== undefined)
      updateData.balance = updateUserDto.balance.toString();
    if (updateUserDto.plan !== undefined) {
      updateData.plan = updateUserDto.plan;
      updateData.deviceLimit = this.getDeviceLimitByPlan(updateUserDto.plan);
    }
    if (updateUserDto.planExpiresAt !== undefined)
      updateData.planExpiresAt = updateUserDto.planExpiresAt;
    if (updateUserDto.type !== undefined)
      updateData.accountType = updateUserDto.type;
    if (updateUserDto.organizationId !== undefined)
      updateData.organizationId = updateUserDto.organizationId;
    if (updateUserDto.groups !== undefined)
      updateData.groups = updateUserDto.groups;
    if (updateUserDto.metadata !== undefined)
      updateData.metadata = updateUserDto.metadata;

    updateData.updatedAt = new Date();

    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set(updateData)
      .where(and(eq(users.userId, userId), isNull(users.deletedAt)))
      .returning();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get updated roles from Keycloak
    const keycloakUser = await this.keycloakService.getUser(userId);

    const userResult = this.mapDbUserToContract(
      updatedUser,
      keycloakUser.roles
    );

    // Publish user updated event
    await this.kafkaProducer.publishUserUpdated({
      userId: userResult.id,
      email: userResult.email,
      changes: updateUserDto,
      updatedAt:
        updatedUser.updatedAt?.toISOString() ?? new Date().toISOString(),
    });

    return userResult;
  }

  /**
   * Soft delete user
   */
  async remove(userId: string): Promise<void> {
    this.logger.log(`Removing user: ${userId}`);

    // Soft delete in database
    const [deletedUser] = await this.databaseService.db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.userId, userId), isNull(users.deletedAt)))
      .returning();

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Deactivate in Keycloak
    await this.keycloakService.deactivateUser(userId);

    // Publish user deleted event
    await this.kafkaProducer.publishUserDeleted({
      userId: deletedUser.userId,
      email: deletedUser.email,
      deletedAt:
        deletedUser.deletedAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  /**
   * Update user device usage for billing
   */
  async updateDeviceUsage(
    userId: string,
    deviceCount: number,
    dataUsageMB: number
  ): Promise<void> {
    this.logger.log(
      `Updating device usage for user ${userId}: devices=${deviceCount}, data=${dataUsageMB}MB`
    );

    await this.databaseService.db
      .update(users)
      .set({
        currentDeviceCount: deviceCount,
        monthlyDataUsage: dataUsageMB.toString(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.userId, userId), isNull(users.deletedAt)));
  }

  /**
   * Get device limit based on plan
   */
  private getDeviceLimitByPlan(plan: string): number {
    switch (plan) {
      case 'free':
        return 5;
      case 'pro':
        return 50;
      case 'enterprise':
        return 1000;
      default:
        return 5;
    }
  }

  /**
   * Map database user to contract format
   */
  private mapDbUserToContract(dbUser: SelectUser, roles: string[]): User {
    return {
      userId: dbUser.userId,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar || undefined,
      roles: roles as Array<
        | 'admin'
        | 'personal-user'
        | 'organization-user'
        | 'group-user'
        | 'organization-admin'
        | 'group-admin'
        | 'organization-owner'
      >,
      balance: parseFloat(dbUser.balance || '0'),
      plan: dbUser.plan as 'free' | 'pro' | 'enterprise',
      planExpiresAt: dbUser.planExpiresAt || undefined,
      type: dbUser.accountType as 'individual' | 'organization',
      organizationId: dbUser.organizationId || undefined,
      groups: dbUser.groups || [],
      metadata: dbUser.metadata || {},
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }
}
