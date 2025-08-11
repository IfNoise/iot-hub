import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgTable,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Certificates table
 */
export const certificatesTable = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Certificate identification
    serialNumber: varchar('serial_number', { length: 255 }).notNull().unique(),
    commonName: varchar('common_name', { length: 255 }).notNull(),
    fingerprint: varchar('fingerprint', { length: 255 }).notNull().unique(),

    // Certificate type and ownership
    type: varchar('type', { length: 20 }).notNull(),
    deviceId: varchar('device_id', { length: 255 }),
    userId: uuid('user_id'),
    organizationId: uuid('organization_id'),

    // Certificate data
    pemCertificate: text('pem_certificate').notNull(),
    pemPrivateKey: text('pem_private_key'), // Only for generated certificates

    // Certificate metadata
    subject: text('subject').notNull(),
    issuer: text('issuer').notNull(),

    // Validity
    validFrom: timestamp('valid_from').notNull(),
    validTo: timestamp('valid_to').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),

    // Revocation info
    revokedAt: timestamp('revoked_at'),
    revocationReason: varchar('revocation_reason', { length: 100 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    serialNumberIdx: uniqueIndex('certificates_serial_number_idx').on(
      table.serialNumber
    ),
    fingerprintIdx: uniqueIndex('certificates_fingerprint_idx').on(
      table.fingerprint
    ),
    deviceIdIdx: index('certificates_device_id_idx').on(table.deviceId),
    userIdIdx: index('certificates_user_id_idx').on(table.userId),
    organizationIdIdx: index('certificates_organization_id_idx').on(
      table.organizationId
    ),
    statusIdx: index('certificates_status_idx').on(table.status),
    typeIdx: index('certificates_type_idx').on(table.type),
    validityIdx: index('certificates_validity_idx').on(
      table.validFrom,
      table.validTo
    ),
  })
);

/**
 * Zod schemas for validation
 */
export const insertCertificateSchema = createInsertSchema(certificatesTable);
export const selectCertificateSchema = createSelectSchema(certificatesTable);

// Export types
export type DatabaseCertificate = typeof certificatesTable.$inferSelect;
export type DatabaseInsertCertificate = typeof certificatesTable.$inferInsert;
