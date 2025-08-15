import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type User,
  type CreateUser,
  type UpdateUser,
} from '@iot-hub/acm-contracts';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { KeycloakIntegrationService } from '../infrastructure/keycloak/keycloak-integration.service.js';
import { KafkaProducer } from '../infrastructure/kafka/kafka.producer.js';
import {
  usersTable,
  type DatabaseUser,
  type DatabaseInsertUser,
  and,
  eq,
  like,
  count,
  isNull,
  or,
} from '@iot-hub/shared';
import { KeycloakUserRepresentation } from '../infrastructure/keycloak/keycloak-integration.service.js';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly repository = {
    findByUserId: async (userId: string): Promise<User | null> => {
      const [user] = await this.databaseService.db
        .select({
          id: usersTable.id,
          userId: usersTable.userId,
          email: usersTable.email,
          name: usersTable.name,
          avatar: usersTable.avatar,
          roles: usersTable.roles,
          balance: usersTable.balance,
          plan: usersTable.plan,
          planExpiresAt: usersTable.planExpiresAt,
          accountType: usersTable.accountType,
          organizationId: usersTable.organizationId,
          groups: usersTable.groups,
          metadata: usersTable.metadata,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          deletedAt: usersTable.deletedAt,
        })
        .from(usersTable)
        .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
        .limit(1);

      return user ? this.mapDbUserToContract(user, ['personal-user']) : null;
    },

    findByInternalId: async (internalId: string): Promise<User | null> => {
      const [user] = await this.databaseService.db
        .select({
          id: usersTable.id,
          userId: usersTable.userId,
          email: usersTable.email,
          name: usersTable.name,
          avatar: usersTable.avatar,
          roles: usersTable.roles,
          balance: usersTable.balance,
          plan: usersTable.plan,
          planExpiresAt: usersTable.planExpiresAt,
          accountType: usersTable.accountType,
          organizationId: usersTable.organizationId,
          groups: usersTable.groups,
          metadata: usersTable.metadata,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          deletedAt: usersTable.deletedAt,
        })
        .from(usersTable)
        .where(and(eq(usersTable.id, internalId), isNull(usersTable.deletedAt)))
        .limit(1);

      return user ? this.mapDbUserToContract(user, ['personal-user']) : null;
    },

    findByEmail: async (email: string): Promise<User | null> => {
      const [user] = await this.databaseService.db
        .select({
          id: usersTable.id,
          userId: usersTable.userId,
          email: usersTable.email,
          name: usersTable.name,
          avatar: usersTable.avatar,
          roles: usersTable.roles,
          balance: usersTable.balance,
          plan: usersTable.plan,
          planExpiresAt: usersTable.planExpiresAt,
          accountType: usersTable.accountType,
          organizationId: usersTable.organizationId,
          groups: usersTable.groups,
          metadata: usersTable.metadata,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          deletedAt: usersTable.deletedAt,
        })
        .from(usersTable)
        .where(and(eq(usersTable.email, email), isNull(usersTable.deletedAt)))
        .limit(1);

      return user ? this.mapDbUserToContract(user, ['personal-user']) : null;
    },

    create: async (userData: DatabaseInsertUser): Promise<User> => {
      const [insertedUser] = await this.databaseService.db
        .insert(usersTable)
        .values(userData)
        .returning();

      return this.mapDbUserToContract(insertedUser, ['personal-user']);
    },

    update: async (
      userId: string,
      updateData: Partial<DatabaseInsertUser>
    ): Promise<User> => {
      const [updatedUser] = await this.databaseService.db
        .update(usersTable)
        .set(updateData)
        .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
        .returning();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return this.mapDbUserToContract(updatedUser, ['personal-user']);
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
  async syncFromKeycloak(keycloakUserId: string): Promise<User | null> {
    this.logger.log(`Syncing user from Keycloak: ${keycloakUserId}`);

    try {
      // 1. Get user from Keycloak
      const keycloakUser = await this.keycloakService.getUserById(
        keycloakUserId
      );

      if (!keycloakUser) {
        this.logger.warn(
          `User ${keycloakUserId} not found in Keycloak, skipping sync`
        );

        // Проверяем, существует ли пользователь в локальной БД
        const existingLocalUser = await this.repository.findByUserId(
          keycloakUserId
        );
        if (existingLocalUser) {
          this.logger.log(
            `User ${keycloakUserId} exists in local DB but not in Keycloak`
          );
          return existingLocalUser;
        }

        return null; // Возвращаем null вместо ошибки
      }

      // 2. Check if user already exists in local database
      const existingUser = await this.repository.findByUserId(keycloakUserId);

      if (existingUser) {
        // Update existing user
        return this.updateFromKeycloak(keycloakUserId, keycloakUser);
      }

      // 3. Create new user in local database
      const dbUser: DatabaseInsertUser = {
        userId: keycloakUser.id,
        email: keycloakUser.email,
        name: `${keycloakUser.firstName || ''} ${
          keycloakUser.lastName || ''
        }`.trim(),
        avatar: undefined,
        balance: '0.00',
        plan:
          (keycloakUser.attributes?.plan?.[0] as
            | 'free'
            | 'pro'
            | 'enterprise') || 'free',
        planExpiresAt: undefined,
        accountType:
          (keycloakUser.attributes?.accountType?.[0] as
            | 'individual'
            | 'organization') || 'individual',
        organizationId: keycloakUser.attributes?.organizationId?.[0] || null,
        groups: keycloakUser.groups || [],
        metadata: keycloakUser.attributes || {},
      };

      const createdUser = await this.repository.create(dbUser);

      this.logger.log(`User synced from Keycloak: ${createdUser.email}`);
      return createdUser;
    } catch (error) {
      this.logger.error(
        `Failed to sync user from Keycloak: ${keycloakUserId}`,
        error instanceof Error ? error.message : error
      );
      if (error instanceof Error) {
        this.logger.error(`Stack trace:`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Update local user from Keycloak data
   */
  private async updateFromKeycloak(
    keycloakUserId: string,
    keycloakUser: KeycloakUserRepresentation
  ): Promise<User> {
    const updateData: Partial<DatabaseInsertUser> = {
      email: keycloakUser.email,
      name: `${keycloakUser.firstName || ''} ${
        keycloakUser.lastName || ''
      }`.trim(),
      plan:
        (keycloakUser.attributes?.plan?.[0] as 'free' | 'pro' | 'enterprise') ||
        'free',
      accountType:
        (keycloakUser.attributes?.accountType?.[0] as
          | 'individual'
          | 'organization') || 'individual',
      organizationId: keycloakUser.attributes?.organizationId?.[0] || null,
      groups: keycloakUser.groups || [],
      metadata: keycloakUser.attributes || {},
    };

    const updatedUser = await this.repository.update(
      keycloakUserId,
      updateData
    );
    this.logger.log(`User updated from Keycloak: ${updatedUser.email}`);
    return updatedUser;
  }

  /**
   * Create user invitation (still needed for inviting usersTable to organizations)
   * This creates a placeholder record that will be synced when user actually registers
   */
  async createInvitation(
    createUserDto: CreateUser
  ): Promise<{ invitationId: string; inviteUrl: string }> {
    this.logger.log(
      `Creating user invitation for email: ${createUserDto.email}`
    );

    try {
      // Check if user already exists
      const existingUser = await this.repository.findByEmail(
        createUserDto.email
      );
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
      this.logger.error(
        `Failed to create user invitation: ${createUserDto.email}`,
        error
      );
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
   * Get internal database ID by Keycloak user ID
   */
  async getInternalIdByUserId(userId: string): Promise<string | null> {
    const [user] = await this.databaseService.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
      .limit(1);

    return user?.id || null;
  }

  /**
   * Get usersTable with pagination and filtering
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    organizationId?: string;
    plan?: string;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, search, organizationId, plan } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [isNull(usersTable.deletedAt)];

    if (search) {
      const searchCondition = or(
        like(usersTable.email, `%${search}%`),
        like(usersTable.name, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (organizationId) {
      conditions.push(eq(usersTable.organizationId, organizationId));
    }

    if (plan) {
      conditions.push(eq(usersTable.plan, plan));
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
      .from(usersTable);

    if (whereCondition) {
      totalCountQuery.where(whereCondition);
    }

    const [{ count: totalCount }] = await totalCountQuery;

    // Get usersTable with pagination
    const usersQuery = this.databaseService.db
      .select({
        id: usersTable.id,
        userId: usersTable.userId,
        email: usersTable.email,
        name: usersTable.name,
        avatar: usersTable.avatar,
        roles: usersTable.roles,
        balance: usersTable.balance,
        plan: usersTable.plan,
        planExpiresAt: usersTable.planExpiresAt,
        accountType: usersTable.accountType,
        organizationId: usersTable.organizationId,
        groups: usersTable.groups,
        metadata: usersTable.metadata,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .limit(limit)
      .offset(offset)
      .orderBy(usersTable.createdAt);

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
      .select({
        id: usersTable.id,
        userId: usersTable.userId,
        email: usersTable.email,
        name: usersTable.name,
        avatar: usersTable.avatar,
        roles: usersTable.roles,
        balance: usersTable.balance,
        plan: usersTable.plan,
        planExpiresAt: usersTable.planExpiresAt,
        accountType: usersTable.accountType,
        organizationId: usersTable.organizationId,
        groups: usersTable.groups,
        metadata: usersTable.metadata,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
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
      .select({
        id: usersTable.id,
        userId: usersTable.userId,
        email: usersTable.email,
        name: usersTable.name,
        avatar: usersTable.avatar,
        roles: usersTable.roles,
        balance: usersTable.balance,
        plan: usersTable.plan,
        planExpiresAt: usersTable.planExpiresAt,
        accountType: usersTable.accountType,
        organizationId: usersTable.organizationId,
        groups: usersTable.groups,
        metadata: usersTable.metadata,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.email, email), isNull(usersTable.deletedAt)))
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
    const updateData: Partial<DatabaseInsertUser> = {};

    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.avatar !== undefined)
      updateData.avatar = updateUserDto.avatar;
    if (updateUserDto.balance !== undefined)
      updateData.balance = updateUserDto.balance.toString();
    if (updateUserDto.plan !== undefined) {
      updateData.plan = updateUserDto.plan;
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
      .update(usersTable)
      .set(updateData)
      .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
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
      .update(usersTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)))
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
      devicesCount: 0, // TODO: подсчитать реальное количество устройств
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
      .update(usersTable)
      .set({
        updatedAt: new Date(),
      })
      .where(and(eq(usersTable.userId, userId), isNull(usersTable.deletedAt)));
  }

  /**
   * Map database user to contract format
   */
  private mapDbUserToContract(
    dbUser: DatabaseUser,
    additionalRoles: string[] = []
  ): User {
    return {
      id: dbUser.userId, // Use userId as id for contract
      userId: dbUser.userId,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar || undefined,
      roles: [...(dbUser.roles || []), ...additionalRoles] as Array<
        | 'admin'
        | 'personal-user'
        | 'organization-user'
        | 'group-user'
        | 'organization-admin'
        | 'group-admin'
        | 'organization-owner'
      >,
      balance: parseFloat(dbUser.balance || '0'),
      plan: dbUser.plan as 'free' | 'pro' | 'enterprise' | 'business',
      planExpiresAt: dbUser.planExpiresAt || undefined,
      accountType: dbUser.accountType as 'individual' | 'organization',
      organizationId: dbUser.organizationId || null,
      groups: dbUser.groups || [],
      metadata: dbUser.metadata || {},
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  }

  /**
   * Получает пользователя по внутреннему ID базы данных
   */
  async findByInternalId(internalId: string): Promise<User | null> {
    try {
      const user = await this.repository.findByInternalId(internalId);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find user by internal ID ${internalId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
  /**
   * Получает пользователя по Keycloak ID
   */
  async findByUserId(userId: string): Promise<User | null> {
    try {
      const user = await this.repository.findByUserId(userId);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find user by Keycloak ID ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Обновляет пользователя как владельца организации
   */
  async updateAsOrganizationOwner(
    userId: string,
    organizationId: string
  ): Promise<User | null> {
    try {
      this.logger.log(`Updating user ${userId} as organization owner`);
      const existingUser = await this.repository.findByUserId(userId);
      if (!existingUser) {
        this.logger.warn(`User ${userId} not found`);
        return null;
      }

      const updateData: Partial<DatabaseInsertUser> = {
        accountType: 'enterprise',
        plan: 'business',
        organizationId: organizationId,
        roles: ['organization-owner'],
      };
      const updatedUser = await this.repository.update(
        existingUser.id,
        updateData
      );

      this.logger.log(
        `Successfully updated user ${userId} as organization owner`
      );

      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Failed to update user ${userId} as organization owner: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Создает пользователя из данных REGISTER события
   */
  async createUserFromEventData(userData: {
    userId: string;
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User | null> {
    try {
      this.logger.log(`Creating user from event data: ${userData.userId}`);

      // Проверяем обязательные поля
      if (!userData.email || !userData.username) {
        this.logger.error(
          `Missing required fields for user ${userData.userId}: email=${userData.email}, username=${userData.username}`
        );
        return null;
      }

      // Проверяем, не существует ли уже такой пользователь
      const existingUser = await this.repository.findByUserId(userData.userId);

      if (existingUser) {
        this.logger.log(
          `User ${userData.userId} already exists, returning existing user`
        );
        return existingUser;
      }

      // Создаем нового пользователя
      const dbUser: DatabaseInsertUser = {
        userId: userData.userId,
        email: userData.email,
        name:
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          userData.username,
        roles: ['organization-user'],
        metadata: {
          source: 'register_event',
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      };

      this.logger.debug(
        `Creating user in database with data: ${JSON.stringify(dbUser)}`
      );

      const createdUser = await this.repository.create(dbUser);

      this.logger.log(
        `Successfully created user ${userData.userId} from event data`
      );

      return createdUser;
    } catch (error) {
      this.logger.error(
        `Failed to create user ${userData.userId} from event data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
}
