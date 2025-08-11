import {
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  pgTable,
  text,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Owner type enum for devices
 */
export const OwnerTypeEnum = z.enum(['user', 'group']);
export const DeviceStatusEnum = z.enum(['unbound', 'bound', 'revoked']);

/**
 * Devices table - synchronized with @iot-hub/devices schemas
 */
export const devicesTable = pgTable(
  'devices',
  {
    // Primary identifier - using deviceId as primary key
    id: varchar('id', { length: 255 }).primaryKey(),

    // Device info
    model: varchar('model', { length: 255 }).notNull().default(''),
    publicKey: text('public_key').notNull(),
    firmwareVersion: varchar('firmware_version', { length: 50 }),

    // Ownership
    ownerId: uuid('owner_id'),
    ownerType: varchar('owner_type', { length: 10 }).notNull().default('user'),
    status: varchar('status', { length: 20 }).notNull().default('unbound'),

    // Enterprise fields
    organizationId: uuid('organization_id'),
    groupId: uuid('group_id'),

    // Timestamps
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    boundAt: timestamp('bound_at'),
    bindingTokenExpiresAt: timestamp('binding_token_expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Device configuration and state (JSON for flexibility)
    deviceData: jsonb('device_data').$type<{
      discreteInputs?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        state: boolean;
      }>;
      analogInputs?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        value: number;
        scale: number;
      }>;
      discreteOutputs?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        state: boolean;
      }>;
      analogOutputs?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        value: number;
        scale: number;
      }>;
      sensors?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        value: number;
        scale: number;
        units: string;
      }>;
      discreteTimers?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        output: string;
        onTime: number;
        offTime: number;
        isRunning: boolean;
        currentState: boolean;
      }>;
      analogTimers?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        output: string;
        onValue: number;
        offValue: number;
        onTime: number;
        offTime: number;
        isRunning: boolean;
        currentValue: number;
      }>;
    }>(),

    // Soft delete
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    ownerIdx: index('devices_owner_idx').on(table.ownerId),
    organizationIdx: index('devices_organization_idx').on(table.organizationId),
    statusIdx: index('devices_status_idx').on(table.status),
    modelIdx: index('devices_model_idx').on(table.model),
    lastSeenIdx: index('devices_last_seen_idx').on(table.lastSeenAt),
  })
);

/**
 * Zod schemas for validation
 */
export const insertDeviceSchema = createInsertSchema(devicesTable);
export const selectDeviceSchema = createSelectSchema(devicesTable);

// Export types
export type DatabaseDevice = typeof devicesTable.$inferSelect;
export type DatabaseInsertDevice = typeof devicesTable.$inferInsert;
