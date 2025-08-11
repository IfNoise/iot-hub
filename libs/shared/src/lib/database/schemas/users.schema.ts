import {
  uuid,
  varchar,
  timestamp,
  decimal,
  jsonb,
  index,
  uniqueIndex,
  pgTable,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Users table - synchronized with @iot-hub/users schemas
 * This is the single source of truth for users, used by all services
 */
export const usersTable = pgTable(
  'users',
  {
    // Primary identifiers (matching UserBaseSchema)
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull().unique(), // Keycloak user ID
    email: varchar('email', { length: 255 }).notNull().unique(),

    // Basic info (matching UserBaseSchema)
    name: varchar('name', { length: 100 }).notNull(),
    avatar: varchar('avatar', { length: 500 }), // URL to avatar

    // Roles and permissions (matching UserBaseSchema)
    roles: jsonb('roles').$type<string[]>().notNull().default([]),

    // Service-specific fields (matching UserBaseSchema)
    balance: decimal('balance', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    plan: varchar('plan', { length: 20 }).notNull().default('free'), // PlanTypeEnum
    planExpiresAt: timestamp('plan_expires_at'),
    accountType: varchar('account_type', { length: 20 })
      .notNull()
      .default('individual'), // UserTypeEnum

    // Enterprise fields (matching UserBaseSchema)
    organizationId: uuid('organization_id'),
    groups: jsonb('groups').$type<string[]>(), // Array of group IDs

    // Metadata (matching UserBaseSchema)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps (matching UserBaseSchema)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Soft delete for compliance
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    userIdIdx: uniqueIndex('users_user_id_idx').on(table.userId),
    organizationIdx: index('users_organization_idx').on(table.organizationId),
    planIdx: index('users_plan_idx').on(table.plan),
    rolesIdx: index('users_roles_idx').on(table.roles),
  })
);

/**
 * Zod schemas for validation
 */
export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);

// Export types that match the contract schemas
export type DatabaseUser = typeof usersTable.$inferSelect;
export type DatabaseInsertUser = typeof usersTable.$inferInsert;
