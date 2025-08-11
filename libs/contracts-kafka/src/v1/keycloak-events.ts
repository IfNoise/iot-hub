/**
 * Keycloak Event Schemas
 *
 * Zod-схемы для событий, поступающих напрямую от Keycloak
 */

import { z } from 'zod';
import { BaseEventSchema, BaseCommandSchema } from '../shared/base-schemas.js';

// ============= KEYCLOAK USER EVENTS =============

/**
 * Схема для деталей пользователя в Keycloak событиях
 */
export const KeycloakUserDetailsSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_verified: z.string().optional(),
  updated_username: z.string().optional(),
  updated_email: z.string().email().optional(),
  updated_first_name: z.string().optional(),
  updated_last_name: z.string().optional(),
  previous_email: z.string().email().optional(),
  previous_first_name: z.string().optional(),
  previous_last_name: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  consent: z.string().optional(),
  register_method: z.string().optional(),
  custom_required_action: z.string().optional(),
});

/**
 * Схема для Keycloak пользовательских событий
 */
export const KeycloakUserEventSchema = z.object({
  '@class': z.string(),
  id: z.string().nullable(),
  time: z.number(),
  type: z.enum([
    'REGISTER',
    'LOGIN',
    'LOGOUT',
    'UPDATE_PROFILE',
    'DELETE_ACCOUNT',
  ]),
  realmId: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  details: KeycloakUserDetailsSchema,
});

// ============= KEYCLOAK ORGANIZATION EVENTS =============

/**
 * Схема для деталей организации в Keycloak событиях
 */
export const KeycloakOrganizationDetailsSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  url: z.string().url().optional(),
  alias: z.string().optional(),
  path: z.string().optional(),
  parentId: z.string().optional(),
  attributes: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Схема для Keycloak организационных событий
 */
export const KeycloakOrganizationEventSchema = z.object({
  '@class': z.string(),
  id: z.string().nullable(),
  time: z.number(),
  type: z.enum(['REGISTER', 'UPDATE', 'DELETE']),
  realmId: z.string(),
  organizationId: z.string(),
  details: KeycloakOrganizationDetailsSchema,
});

// ============= TYPES =============

/**
 * Типы, выведенные из схем
 */
export type KeycloakUserDetails = z.infer<typeof KeycloakUserDetailsSchema>;
export type KeycloakUserEvent = z.infer<typeof KeycloakUserEventSchema>;
export type KeycloakOrganizationDetails = z.infer<
  typeof KeycloakOrganizationDetailsSchema
>;
export type KeycloakOrganizationEvent = z.infer<
  typeof KeycloakOrganizationEventSchema
>;

// ============= EXPORTS =============

/**
 * Все Keycloak схемы событий
 */
export const KeycloakEventSchemas = z.discriminatedUnion('type', [
  KeycloakUserEventSchema.extend({ eventCategory: z.literal('user') }),
  KeycloakOrganizationEventSchema.extend({
    eventCategory: z.literal('organization'),
  }),
]);

export type KeycloakEvent = z.infer<typeof KeycloakEventSchemas>;
