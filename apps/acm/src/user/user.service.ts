import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type User,
  type CreateUser,
  type UpdateUser,
} from '@iot-hub/acm-contracts';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { KeycloakIntegrationService } from '../infrastructure/keycloak/keycloak-integration.service.js';
import { KafkaProducer } from '../infrastructure/kafka/kafka.producer.js';
import {
  users,
  type InsertUser,
  type SelectUser,
} from '../infrastructure/database/schema.js';
import { and, eq, like, count, isNull, or } from 'drizzle-orm';
import { KeycloakUserRepresentation } from '../infrastructure/keycloak/keycloak-integration.service.js';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly repository = {
    findByUserId: async (userId: string): Promise<User | null> => {
      const [user] = await this.databaseService.db
        .select()
        .from(users)
        .where(and(eq(users.userId, userId), isNull(users.deletedAt)))
        .limit(1);
      
      return user ? this.mapDbUserToContract(user, []) : null;
    },
    
    findByEmail: async (email: string): Promise<User | null> => {
      const [user] = await this.databaseService.db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .limit(1);
      
      return user ? this.mapDbUserToContract(user, []) : null;
    },
    
    create: async (userData: InsertUser): Promise<User> => {
      const [insertedUser] = await this.databaseService.db
        .insert(users)
        .values(userData)
        .returning();
      
      return this.mapDbUserToContract(insertedUser, []);
    },
    
    update: async (userId: string, updateData: Partial<InsertUser>): Promise<User> => {
      const [updatedUser] = await this.databaseService.db
        .update(users)
        .set(updateData)
        .where(and(eq(users.userId, userId), isNull(users.deletedAt)))
        .returning();
      
      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }
      
      return this.mapDbUserToContract(updatedUser, []);
    },
  };

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly keycloakService: KeycloakIntegrationService,
    private readonly kafkaProducer: KafkaProducer
  ) {}

  /**
   * Sync user from Keycloak to local database
   * This is called when we receive Keycloak events via Kafka
   */
  async syncFromKeycloak(keycloakUserId: string): Promise<User> {
    this.logger.log(`Syncing user from Keycloak: ${keycloakUserId}`);

    try {
      // 1. Get user from Keycloak
      const keycloakUser = await this.keycloakService.getUserById(keycloakUserId);
      
      if (!keycloakUser) {
        throw new Error(`User ${keycloakUserId} not found in Keycloak`);
      }

      // 2. Check if user already exists in local database
      const existingUser = await this.repository.findByUserId(keycloakUserId);
      
      if (existingUser) {
        // Update existing user
        return this.updateFromKeycloak(keycloakUserId, keycloakUser);
      }

      // 3. Create new user in local database
      const dbUser: InsertUser = {
        userId: keycloakUser.id,
        email: keycloakUser.email,
        name: `${keycloakUser.firstName || ''} ${keycloakUser.lastName || ''}`.trim(),
        avatar: undefined,
        balance: '0.00',
        plan: keycloakUser.attributes?.plan?.[0] as 'free' | 'pro' | 'enterprise' || 'free',
        planExpiresAt: undefined,
        accountType: keycloakUser.attributes?.accountType?.[0] as 'individual' | 'organization' || 'individual',
        organizationId: keycloakUser.attributes?.organizationId?.[0] || null,
        groups: keycloakUser.groups || [],
        metadata: keycloakUser.attributes || {},
      };

      const createdUser = await this.repository.create(dbUser);
      
      this.logger.log(`User synced from Keycloak: ${createdUser.email}`);
      return createdUser;
    } catch (error) {
      this.logger.error(`Failed to sync user from Keycloak: ${keycloakUserId}`, error);
      throw error;
    }
  }

  /**
   * Update local user from Keycloak data
   */
  private async updateFromKeycloak(keycloakUserId: string, keycloakUser: KeycloakUserRepresentation): Promise<User> {
    const updateData: Partial<InsertUser> = {
      email: keycloakUser.email,
      name: `${keycloakUser.firstName || ''} ${keycloakUser.lastName || ''}`.trim(),
      plan: keycloakUser.attributes?.plan?.[0] as 'free' | 'pro' | 'enterprise' || 'free',
      accountType: keycloakUser.attributes?.accountType?.[0] as 'individual' | 'organization' || 'individual',
      organizationId: keycloakUser.attributes?.organizationId?.[0] || null,
      groups: keycloakUser.groups || [],
      metadata: keycloakUser.attributes || {},
    };

    const updatedUser = await this.repository.update(keycloakUserId, updateData);
    this.logger.log(`User updated from Keycloak: ${updatedUser.email}`);
    return updatedUser;
  }

  /**
   * Create user invitation (still needed for inviting users to organizations)
   * This creates a placeholder record that will be synced when user actually registers
   */
  async createInvitation(createUserDto: CreateUser): Promise<{ invitationId: string; inviteUrl: string }> {
    this.logger.log(`Creating user invitation for email: ${createUserDto.email}`);

    try {
      // Check if user already exists
      const existingUser = await this.repository.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create invitation record (you might want to store this in a separate invitations table)
      const invitationId = randomUUID();
      const inviteUrl = `${process.env.FRONTEND_URL}/invite/${invitationId}`;

      // TODO: Store invitation in database/cache
      // TODO: Send invitation email

      this.logger.log(`User invitation created: ${createUserDto.email}`);
      return { invitationId, inviteUrl };
    } catch (error) {
      this.logger.error(`Failed to create user invitation: ${createUserDto.email}`, error);
      throw error;
    }
  }

  /**
   * Get user by ID from local database
   */
  async findById(userId: string): Promise<User | null> {
    const user = await this.repository.findByUserId(userId);
    return user;
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
      const searchCondition = or(
        like(users.email, `%${search}%`),
        like(users.name, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }

    if (plan) {
      conditions.push(eq(users.plan, plan));
    }

    const whereCondition =
      conditions.length > 1
        ? and(...conditions)
        : conditions.length === 1
        ? conditions[0]
        : undefined;

    // Get total count
    const totalCountQuery = this.databaseService.db
      .select({ count: count() })
      .from(users);

    if (whereCondition) {
      totalCountQuery.where(whereCondition);
    }

    const [{ count: totalCount }] = await totalCountQuery;

    // Get users with pagination
    const usersQuery = this.databaseService.db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt);

    if (whereCondition) {
      usersQuery.where(whereCondition);
    }

    const dbUsers = await usersQuery;

    // Get roles from Keycloak for each user
    const usersWithRoles = await Promise.all(
      dbUsers.map(async (dbUser) => {
        try {
          // We don't need the keycloak user data since KeycloakUser doesn't have roles
          await this.keycloakService.getUserById(dbUser.userId);
          return this.mapDbUserToContract(dbUser, ['personal-user']); // Default role
        } catch (error) {
          this.logger.warn(
            `Failed to get Keycloak data for user ${dbUser.userId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
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
    try {
      // We don't need the keycloak user data since KeycloakUser doesn't have roles
      await this.keycloakService.getUserById(userId);
      return this.mapDbUserToContract(dbUser, ['personal-user']); // Default role
    } catch (error) {
      this.logger.warn(
        `Failed to get Keycloak data for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return this.mapDbUserToContract(dbUser, ['personal-user']); // fallback role
    }
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

    try {
      await this.keycloakService.getUserById(dbUser.userId);
      return this.mapDbUserToContract(dbUser, ['personal-user']); // Default role
    } catch {
      this.logger.warn(`Failed to get Keycloak data for user ${dbUser.userId}`);
      return this.mapDbUserToContract(dbUser, ['personal-user']); // fallback role
    }
  }

  /**
   * Update user data
   */
  async update(userId: string, updateUserDto: UpdateUser): Promise<User> {
    this.logger.log(`Updating user: ${userId}`);

    // Check if user exists
    await this.findOne(userId);

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
    if (updateUserDto.accountType !== undefined)
      updateData.accountType = updateUserDto.accountType;
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
    const userResult = this.mapDbUserToContract(
      updatedUser,
      ['personal-user'] // Default role since we can't get roles from Keycloak easily
    );

    // Publish user updated event
    await this.kafkaProducer.publishUserUpdated({
      userId: userResult.userId,
      previousData: {}, // We don't track previous data
      newData: updateUserDto,
      updatedBy: userResult.userId, // Self-update for now
      updatedAt:
        updatedUser.updatedAt?.toISOString() ?? new Date().toISOString(),
      changes: Object.keys(updateUserDto).map((field) => ({
        field,
        oldValue: undefined, // We don't track old values
        newValue: updateUserDto[field as keyof UpdateUser],
      })),
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

    // Note: We could deactivate in Keycloak here if needed
    // await this.keycloakService.deleteUser(userId);

    // Publish user deleted event
    await this.kafkaProducer.publishUserDeleted({
      userId: deletedUser.userId,
      email: deletedUser.email,
      deletedAt:
        deletedUser.deletedAt?.toISOString() ?? new Date().toISOString(),
      deletedBy: 'system', // Could be passed as parameter
      hardDelete: false,
      devicesCount: deletedUser.currentDeviceCount || 0,
      reason: 'User requested deletion',
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
      id: dbUser.userId, // Use userId as id for contract
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
      accountType: dbUser.accountType as 'individual' | 'organization',
      organizationId: dbUser.organizationId || null,
      groups: dbUser.groups || [],
      metadata: dbUser.metadata || {},
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }
}
