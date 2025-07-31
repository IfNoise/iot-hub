import { z } from 'zod';
import { PlanTypeEnum, UserTypeEnum } from '@iot-hub/users';
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
    userId: varchar('userId', { length: 255 }).notNull().unique(), // Keycloak user ID - camelCase column name
    email: varchar('email', { length: 255 }).notNull().unique(),

    // Cached from Keycloak for performance (matching contracts)
    name: varchar('name', { length: 100 }).notNull(), // Single name field as per contracts
    avatar: varchar('avatar', { length: 500 }), // URL to avatar

    // Service-specific fields matching contracts
    balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00'),
    plan: varchar('plan', { length: 20 }).notNull().default('free'), // free | pro | enterprise
    planExpiresAt: timestamp('planExpiresAt'),
    accountType: varchar('accountType', { length: 20 })
      .notNull()
      .default('individual'), // individual | organization

    // Organization membership (matching contracts)
    organizationId: uuid('organizationId'),
    groups: jsonb('groups').$type<string[]>(), // Array of group IDs

    // Usage tracking for billing
    deviceLimit: integer('deviceLimit').default(5),
    currentDeviceCount: integer('currentDeviceCount').default(0),
    monthlyDataUsage: decimal('monthlyDataUsage', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    // Metadata (flexible storage as per contracts)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps (matching contracts)
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),

    // Soft delete for compliance
    deletedAt: timestamp('deletedAt'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    userIdIdx: uniqueIndex('users_user_id_idx').on(table.userId),
    organizationIdx: index('users_organization_idx').on(table.organizationId),
    planIdx: index('users_plan_idx').on(table.plan),
  })
);

// Zod schemas will be defined at the end of the file with proper validation

/**
 * Organizations table - Enterprise features
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keycloakId: varchar('keycloakId', { length: 255 }).notNull().unique(), // Keycloak organization ID

    // Basic info (cached from Keycloak)
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),

    // Billing configuration
    plan: varchar('plan', { length: 20 }).notNull().default('free'),
    planExpiresAt: timestamp('planExpiresAt'),

    // Resource limits
    maxUsers: integer('maxUsers').default(10),
    maxDevices: integer('maxDevices').default(100),
    maxDataTransferMB: decimal('maxDataTransferMB', {
      precision: 15,
      scale: 2,
    }).default('1000.00'),

    // Current usage
    currentUserCount: integer('currentUserCount').default(0),
    currentDeviceCount: integer('currentDeviceCount').default(0),
    currentMonthDataUsage: decimal('currentMonthDataUsage', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    // Owner
    ownerId: uuid('ownerId')
      .notNull()
      .references(() => users.id),

    // Settings
    settings: jsonb('settings').default({}), // Flexible settings storage

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'),

    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    deletedAt: timestamp('deletedAt'),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    keycloakIdIdx: uniqueIndex('organizations_keycloak_id_idx').on(
      table.keycloakId
    ),
    ownerIdx: index('organizations_owner_idx').on(table.ownerId),
    statusIdx: index('organizations_status_idx').on(table.status),
  })
);

/**
 * Groups table - Enterprise hierarchical groups
 */
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keycloakId: varchar('keycloakId', { length: 255 }).notNull().unique(),

    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizations.id),
    parentGroupId: uuid('parentGroupId').references(() => groups.id), // Self-reference for hierarchy

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Group-specific resource limits (inherit from parent if null)
    maxUsers: integer('maxUsers'),
    maxDevices: integer('maxDevices'),

    // Permissions (stored as JSON for flexibility)
    permissions: jsonb('permissions').default({}),

    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    deletedAt: timestamp('deletedAt'),
  },
  (table) => ({
    keycloakIdIdx: uniqueIndex('groups_keycloak_id_idx').on(table.keycloakId),
    organizationIdx: index('groups_organization_idx').on(table.organizationId),
    parentGroupIdx: index('groups_parent_group_idx').on(table.parentGroupId),
    nameOrgIdx: index('groups_name_org_idx').on(
      table.name,
      table.organizationId
    ),
  })
);

/**
 * User-Group membership table
 */
export const userGroups = pgTable(
  'user_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    groupId: uuid('groupId')
      .notNull()
      .references(() => groups.id),

    // Role within the group (admin, member, viewer)
    role: varchar('role', { length: 20 }).notNull().default('member'),

    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    userGroupIdx: uniqueIndex('user_groups_user_group_idx').on(
      table.userId,
      table.groupId
    ),
    userIdx: index('user_groups_user_idx').on(table.userId),
    groupIdx: index('user_groups_group_idx').on(table.groupId),
  })
);

/**
 * Billing events for auditing and analytics
 */
export const billingEvents = pgTable(
  'billing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Event details
    eventType: varchar('eventType', { length: 50 }).notNull(), // plan_upgrade, plan_downgrade, payment, etc.
    entityType: varchar('entityType', { length: 20 }).notNull(), // user | organization
    entityId: uuid('entityId').notNull(),

    // Event data
    eventData: jsonb('eventData').notNull(),

    // Financial info
    amount: decimal('amount', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('USD'),

    // Metadata
    metadata: jsonb('metadata').default({}),

    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    eventTypeIdx: index('billing_events_event_type_idx').on(table.eventType),
    entityIdx: index('billing_events_entity_idx').on(
      table.entityType,
      table.entityId
    ),
    createdAtIdx: index('billing_events_created_at_idx').on(table.createdAt),
  })
);

/**
 * Data usage tracking for billing
 */
export const dataUsage = pgTable(
  'data_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Usage attribution
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    organizationId: uuid('organizationId').references(() => organizations.id),
    deviceId: uuid('deviceId'), // Will be linked to DeviceManagement service

    // Usage metrics
    dataTransferredMB: decimal('dataTransferredMB', {
      precision: 15,
      scale: 2,
    }).notNull(),
    messageCount: integer('messageCount').default(0),

    // Time period
    periodStart: timestamp('periodStart').notNull(),
    periodEnd: timestamp('periodEnd').notNull(),

    // Billing info
    billableAmount: decimal('billableAmount', { precision: 10, scale: 2 }),

    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    userPeriodIdx: index('data_usage_user_period_idx').on(
      table.userId,
      table.periodStart
    ),
    organizationPeriodIdx: index('data_usage_org_period_idx').on(
      table.organizationId,
      table.periodStart
    ),
    devicePeriodIdx: index('data_usage_device_period_idx').on(
      table.deviceId,
      table.periodStart
    ),
  })
);

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  plan: PlanTypeEnum,
  accountType: UserTypeEnum,
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const selectUserSchema = createSelectSchema(users);

// User types derived from schemas
export type InsertUser = typeof insertUserSchema._type;
export type SelectUser = typeof selectUserSchema._type;

export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  plan: PlanTypeEnum,
});

export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertGroupSchema = createInsertSchema(groups, {
  name: z.string().min(1).max(255),
});

export const selectGroupSchema = createSelectSchema(groups);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type UserGroup = typeof userGroups.$inferSelect;
export type NewUserGroup = typeof userGroups.$inferInsert;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
export type DataUsage = typeof dataUsage.$inferSelect;
export type NewDataUsage = typeof dataUsage.$inferInsert;
