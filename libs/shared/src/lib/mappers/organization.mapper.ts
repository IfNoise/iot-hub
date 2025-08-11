/**
 * Organization mappers - преобразование между database и contract типами
 */
import { type Organization } from '@iot-hub/users';
import { type DatabaseOrganization } from '../database/schemas/organizations.schema.js';

/**
 * Преобразование из database модели в contract тип
 */
export function dbOrganizationToContract(
  dbOrg: DatabaseOrganization
): Organization {
  return {
    id: dbOrg.id,
    keycloakId: dbOrg.keycloakId,
    name: dbOrg.name,
    slug: dbOrg.slug,
    description: dbOrg.description || undefined,
    plan: dbOrg.plan as Organization['plan'],
    planExpiresAt: dbOrg.planExpiresAt
      ? dbOrg.planExpiresAt.toISOString()
      : undefined,
    maxUsers: dbOrg.maxUsers || undefined,
    maxDevices: dbOrg.maxDevices || undefined,
    contactEmail: dbOrg.contactEmail || undefined,
    billingEmail: dbOrg.billingEmail || undefined,
    metadata: dbOrg.metadata || {},
    createdAt: dbOrg.createdAt.toISOString(),
    updatedAt: dbOrg.updatedAt.toISOString(),
  };
}

/**
 * Преобразование из contract типа в database модель для вставки
 */
export function contractOrganizationToDb(
  org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DatabaseOrganization, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    keycloakId: org.keycloakId,
    name: org.name,
    slug: org.slug,
    description: org.description || null,
    plan: org.plan,
    planExpiresAt: org.planExpiresAt ? new Date(org.planExpiresAt) : null,
    maxUsers: org.maxUsers || null,
    maxDevices: org.maxDevices || null,
    maxDataTransferMB: '1000.00', // Default value
    currentUsers: 0,
    currentDevices: 0,
    currentDataTransferMB: '0.00',
    contactEmail: org.contactEmail || null,
    billingEmail: org.billingEmail || null,
    metadata: org.metadata || null,
  };
}
