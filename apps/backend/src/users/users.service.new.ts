import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq, like, desc, count, and, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  usersTable,
  DatabaseUser,
  DatabaseInsertUser,
  dbUserToContract,
  contractUserToDbInsert,
} from '@iot-hub/shared';
import type {
  User,
  CreateUser,
  UpdateUser,
  UserQuery,
  UsersListResponse,
} from '@iot-hub/users';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>
  ) {}

  async create(createUserData: CreateUser): Promise<User> {
    const insertData = contractUserToDbInsert(createUserData);
    const [dbUser] = await this.db
      .insert(usersTable)
      .values(insertData)
      .returning();

    return dbUserToContract(dbUser);
  }

  async findAll(query: UserQuery = {}): Promise<UsersListResponse> {
    const { page = 1, limit = 10, role, plan, search } = query;

    const offset = (page - 1) * limit;

    const conditions = [];
    if (role) {
      conditions.push(
        this.db.sql`${usersTable.roles} @> ${JSON.stringify([role])}`
      );
    }
    if (plan) {
      conditions.push(eq(usersTable.plan, plan));
    }
    if (search) {
      conditions.push(
        or(
          like(usersTable.name, `%${search}%`),
          like(usersTable.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(usersTable)
      .where(whereClause);

    const dbUsers = await this.db
      .select()
      .from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const users = dbUsers.map(dbUserToContract);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<User> {
    const [dbUser] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return dbUserToContract(dbUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [dbUser] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return dbUser ? dbUserToContract(dbUser) : null;
  }

  async findByKeycloakId(userId: string): Promise<User | null> {
    const [dbUser] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, userId))
      .limit(1);

    return dbUser ? dbUserToContract(dbUser) : null;
  }

  async update(id: string, updateUserData: UpdateUser): Promise<User> {
    const [dbUser] = await this.db
      .update(usersTable)
      .set({
        ...updateUserData,
        balance: updateUserData.balance?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    if (!dbUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return dbUserToContract(dbUser);
  }

  async remove(id: string): Promise<void> {
    await this.db
      .update(usersTable)
      .set({ deletedAt: new Date() })
      .where(eq(usersTable.id, id));
  }

  async createOrUpdate(
    userId: string,
    userData: Partial<CreateUser>
  ): Promise<User> {
    const existingUser = await this.findByKeycloakId(userId);

    if (existingUser) {
      const updateData: UpdateUser = {};

      if (userData.email && userData.email !== existingUser.email) {
        updateData.email = userData.email;
      }
      if (userData.name && userData.name !== existingUser.name) {
        updateData.name = userData.name;
      }
      if (userData.avatar !== existingUser.avatar) {
        updateData.avatar = userData.avatar;
      }
      if (
        userData.roles &&
        JSON.stringify(userData.roles) !== JSON.stringify(existingUser.roles)
      ) {
        updateData.roles = userData.roles;
      }
      if (
        userData.accountType &&
        userData.accountType !== existingUser.accountType
      ) {
        updateData.accountType = userData.accountType;
      }
      if (userData.organizationId !== existingUser.organizationId) {
        updateData.organizationId = userData.organizationId;
      }
      if (
        userData.groups &&
        JSON.stringify(userData.groups) !== JSON.stringify(existingUser.groups)
      ) {
        updateData.groups = userData.groups;
      }
      if (
        userData.metadata &&
        JSON.stringify(userData.metadata) !==
          JSON.stringify(existingUser.metadata)
      ) {
        updateData.metadata = userData.metadata;
      }

      if (Object.keys(updateData).length > 0) {
        return await this.update(existingUser.id, updateData);
      }

      return existingUser;
    }

    const createData: CreateUser = {
      userId,
      email: userData.email || '',
      name: userData.name || '',
      avatar: userData.avatar,
      roles: userData.roles || ['personal-user'],
      balance: userData.balance ?? 0,
      plan: userData.plan ?? 'free',
      accountType: userData.accountType ?? 'individual',
      organizationId: userData.organizationId,
      groups: userData.groups,
      metadata: userData.metadata,
    };

    return await this.create(createData);
  }
}
