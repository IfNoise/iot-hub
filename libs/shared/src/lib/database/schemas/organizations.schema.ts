import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
  uniqueIndex,
  pgTable,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

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
export const insertOrganizationSchema = createInsertSchema(organizationsTable);
export const selectOrganizationSchema = createSelectSchema(organizationsTable);
export const insertGroupSchema = createInsertSchema(groupsTable);
export const selectGroupSchema = createSelectSchema(groupsTable);

// Export types
export type DatabaseOrganization = typeof organizationsTable.$inferSelect;
export type DatabaseInsertOrganization = typeof organizationsTable.$inferInsert;
export type DatabaseGroup = typeof groupsTable.$inferSelect;
export type DatabaseInsertGroup = typeof groupsTable.$inferInsert;
