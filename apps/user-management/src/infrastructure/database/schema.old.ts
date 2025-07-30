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
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Users table - minimal data aligned with existing contracts
 * Most data comes from Keycloak, we store only essential fields for billing and service operation
 */
export const users = pgTable('users', {
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
  accountType: varchar('account_type', { length: 20 }).notNull().default('individual'), // individual | organization
  
  // Organization membership (matching contracts)
  organizationId: uuid('organization_id'),
  groups: jsonb('groups').$type<string[]>(), // Array of group IDs
  
  // Usage tracking for billing
  deviceLimit: integer('device_limit').default(5),
  currentDeviceCount: integer('current_device_count').default(0),
  monthlyDataUsage: decimal('monthly_data_usage', { precision: 15, scale: 2 }).default('0.00'),
  
  // Metadata (flexible storage as per contracts)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps (matching contracts)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Soft delete for compliance
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  userIdIdx: uniqueIndex('users_user_id_idx').on(table.userId),
  organizationIdx: index('users_organization_idx').on(table.organizationId),
  planIdx: index('users_plan_idx').on(table.plan),
}));

// Zod schemas for database operations
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type InsertUser = typeof insertUserSchema._type;
export type SelectUser = typeof selectUserSchema._type;

/**
 * Organizations table - Enterprise features
 */
export const organizations = pgTable('organizations', {
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
  maxDataTransferMB: decimal('max_data_transfer_mb', { precision: 15, scale: 2 }).default('1000.00'),
  
  // Current usage
  currentUserCount: integer('current_user_count').default(0),
  currentDeviceCount: integer('current_device_count').default(0),
  currentMonthDataUsage: decimal('current_month_data_usage', { precision: 15, scale: 2 }).default('0.00'),
  
  // Owner
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  
  // Settings
  settings: jsonb('settings').default({}), // Flexible settings storage
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
  keycloakIdIdx: uniqueIndex('organizations_keycloak_id_idx').on(table.keycloakId),
  ownerIdx: index('organizations_owner_idx').on(table.ownerId),
  statusIdx: index('organizations_status_idx').on(table.status),
}));

/**
 * Groups table - Enterprise hierarchical groups
 */
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  keycloakId: varchar('keycloak_id', { length: 255 }).notNull().unique(),
  
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  parentGroupId: uuid('parent_group_id').references(() => groups.id), // Self-reference for hierarchy
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Group-specific resource limits (inherit from parent if null)
  maxUsers: integer('max_users'),
  maxDevices: integer('max_devices'),
  
  // Permissions (stored as JSON for flexibility)
  permissions: jsonb('permissions').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  keycloakIdIdx: uniqueIndex('groups_keycloak_id_idx').on(table.keycloakId),
  organizationIdx: index('groups_organization_idx').on(table.organizationId),
  parentGroupIdx: index('groups_parent_group_idx').on(table.parentGroupId),
  nameOrgIdx: index('groups_name_org_idx').on(table.name, table.organizationId),
}));

/**
 * User-Group membership table
 */
export const userGroups = pgTable('user_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  
  // Role within the group (admin, member, viewer)
  role: varchar('role', { length: 20 }).notNull().default('member'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userGroupIdx: uniqueIndex('user_groups_user_group_idx').on(table.userId, table.groupId),
  userIdx: index('user_groups_user_idx').on(table.userId),
  groupIdx: index('user_groups_group_idx').on(table.groupId),
}));

/**
 * Billing events for auditing and analytics
 */
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Event details
  eventType: varchar('event_type', { length: 50 }).notNull(), // plan_upgrade, plan_downgrade, payment, etc.
  entityType: varchar('entity_type', { length: 20 }).notNull(), // user | organization
  entityId: uuid('entity_id').notNull(),
  
  // Event data
  eventData: jsonb('event_data').notNull(),
  
  // Financial info
  amount: decimal('amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventTypeIdx: index('billing_events_event_type_idx').on(table.eventType),
  entityIdx: index('billing_events_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('billing_events_created_at_idx').on(table.createdAt),
}));

/**
 * Data usage tracking for billing
 */
export const dataUsage = pgTable('data_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Usage attribution
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  deviceId: uuid('device_id'), // Will be linked to DeviceManagement service
  
  // Usage metrics
  dataTransferredMB: decimal('data_transferred_mb', { precision: 15, scale: 2 }).notNull(),
  messageCount: integer('message_count').default(0),
  
  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Billing info
  billableAmount: decimal('billable_amount', { precision: 10, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userPeriodIdx: index('data_usage_user_period_idx').on(table.userId, table.periodStart),
  organizationPeriodIdx: index('data_usage_org_period_idx').on(table.organizationId, table.periodStart),
  devicePeriodIdx: index('data_usage_device_period_idx').on(table.deviceId, table.periodStart),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  plan: z.enum(userPlanEnum),
  accountType: z.enum(accountTypeEnum),
  status: z.enum(userStatusEnum),
});

export const selectUserSchema = createSelectSchema(users);

export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(userPlanEnum),
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
