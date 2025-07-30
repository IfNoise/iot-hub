import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Users table - minimal data aligned with existing contracts
 * Most data comes from Keycloak, we store only essential fields for billing and service operation
 */
export const users = pgTable(
  'users',
  {
    // Primary identifiers
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull().unique(), // Keycloak user ID (renamed from keycloakId to match contracts)
    email: varchar('email', { length: 255 }).notNull().unique(),

    // Cached from Keycloak for performance (matching contracts)
    name: varchar('name', { length: 100 }).notNull(), // Single name field as per contracts
    avatar: varchar('avatar', { length: 500 }), // URL to avatar

    // Service-specific fields matching contracts
    balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00'),
    plan: varchar('plan', { length: 20 }).notNull().default('free'), // free | pro | enterprise
    planExpiresAt: timestamp('plan_expires_at'),
    accountType: varchar('account_type', { length: 20 })
      .notNull()
      .default('individual'), // individual | organization

    // Organization membership (matching contracts)
    organizationId: uuid('organization_id'),
    groups: jsonb('groups').$type<string[]>(), // Array of group IDs

    // Usage tracking for billing
    deviceLimit: integer('device_limit').default(5),
    currentDeviceCount: integer('current_device_count').default(0),
    monthlyDataUsage: decimal('monthly_data_usage', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    // Metadata (flexible storage as per contracts)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps (matching contracts)
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
  })
);

// Zod schemas for database operations
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type InsertUser = typeof insertUserSchema._type;
export type SelectUser = typeof selectUserSchema._type;
