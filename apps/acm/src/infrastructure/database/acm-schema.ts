/**
 * ACM Service Database Schema
 *
 * Локальная схема для ACM сервиса, содержащая только необходимые таблицы:
 * - users: пользователи системы
 * - organizations: организации
 * - groups: группы в организациях
 *
 * Исключены таблицы, которые не используются в ACM:
 * - devices: управляется в device management сервисах
 * - certificates: управляется в certificate management сервисах
 */

import {
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
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
 * Organizations table - Enterprise features
 */
export const organizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keycloakId: varchar('keycloak_id', { length: 255 }).notNull().unique(), // Keycloak organization ID

    // Basic info (cached from Keycloak)
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),

    // Billing configuration
    plan: varchar('plan', { length: 20 }).notNull().default('free'),
    planExpiresAt: timestamp('plan_expires_at'),

    // Resource limits
    maxUsers: integer('max_users').default(10),
    maxDevices: integer('max_devices').default(100),
    maxDataTransferMB: decimal('max_data_transfer_mb', {
      precision: 15,
      scale: 2,
    }).default('1000.00'),

    // Current usage
    currentUsers: integer('current_users').default(0),
    currentDevices: integer('current_devices').default(0),
    currentDataTransferMB: decimal('current_data_transfer_mb', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    // Contact and billing info
    contactEmail: varchar('contact_email', { length: 255 }),
    billingEmail: varchar('billing_email', { length: 255 }),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    keycloakIdIdx: uniqueIndex('organizations_keycloak_id_idx').on(
      table.keycloakId
    ),
    planIdx: index('organizations_plan_idx').on(table.plan),
  })
);

/**
 * Groups table - Sub-organizations within organizations
 */
export const groupsTable = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    keycloakId: varchar('keycloak_id', { length: 255 }).notNull().unique(),

    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),

    // Resource limits (inherited from organization if not set)
    maxUsers: integer('max_users'),
    maxDevices: integer('max_devices'),

    // Current usage
    currentUsers: integer('current_users').default(0),
    currentDevices: integer('current_devices').default(0),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    organizationIdx: index('groups_organization_idx').on(table.organizationId),
    keycloakIdIdx: uniqueIndex('groups_keycloak_id_idx').on(table.keycloakId),
    // Unique slug within organization
    orgSlugIdx: uniqueIndex('groups_org_slug_idx').on(
      table.organizationId,
      table.slug
    ),
  })
);

/**
 * Zod schemas for validation
 */
export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);
export const insertOrganizationSchema = createInsertSchema(organizationsTable);
export const selectOrganizationSchema = createSelectSchema(organizationsTable);
export const insertGroupSchema = createInsertSchema(groupsTable);
export const selectGroupSchema = createSelectSchema(groupsTable);

// Export types
export type DatabaseUser = typeof usersTable.$inferSelect;
export type DatabaseInsertUser = typeof usersTable.$inferInsert;
export type DatabaseOrganization = typeof organizationsTable.$inferSelect;
export type DatabaseInsertOrganization = typeof organizationsTable.$inferInsert;
export type DatabaseGroup = typeof groupsTable.$inferSelect;
export type DatabaseInsertGroup = typeof groupsTable.$inferInsert;

// Re-export drizzle-orm functions to ensure version consistency
export { and, eq, like, count, isNull, or } from 'drizzle-orm';
export { drizzle } from 'drizzle-orm/postgres-js';
