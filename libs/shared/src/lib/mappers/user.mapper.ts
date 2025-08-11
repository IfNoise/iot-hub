import type { User } from '@iot-hub/users';
import type {
  DatabaseUser,
  DatabaseInsertUser,
} from '../database/schemas/users.schema.js';

/**
 * Converts database user to contract user type
 */
export function dbUserToContract(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    userId: dbUser.userId,
    email: dbUser.email,
    name: dbUser.name,
    avatar: dbUser.avatar ?? undefined,
    roles: dbUser.roles as User['roles'],
    balance: Number(dbUser.balance),
    plan: dbUser.plan as User['plan'],
    planExpiresAt: dbUser.planExpiresAt ?? undefined,
    accountType: dbUser.accountType as User['accountType'],
    organizationId: dbUser.organizationId ?? undefined,
    groups: dbUser.groups ?? undefined,
    metadata: dbUser.metadata ?? undefined,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}

/**
 * Converts contract user to database insert user type
 */
export function contractUserToDbInsert(
  user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): DatabaseInsertUser {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    roles: user.roles,
    balance: user.balance.toString(),
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    accountType: user.accountType,
    organizationId: user.organizationId,
    groups: user.groups,
    metadata: user.metadata,
  };
}
