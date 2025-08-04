import { z } from 'zod';

/**
 * Базовые схемы для ACM (Access Control Management)
 */

/**
 * Роли в системе
 */
export const SystemRoleEnum = z.enum([
  'admin',                    // Системный администратор
  'personal-user',           // Персональный пользователь
  'organization-user',       // Пользователь организации
  'organization-admin',      // Администратор организации
  'organization-owner',      // Владелец организации
  'group-user',             // Пользователь группы
  'group-admin',            // Администратор группы
]);

/**
 * Права доступа (permissions)
 */
export const PermissionEnum = z.enum([
  // Пользователи
  'users:read',
  'users:write',
  'users:delete',
  'users:manage',
  
  // Организации
  'organizations:read',
  'organizations:write',
  'organizations:delete',
  'organizations:manage',
  'organizations:invite',
  
  // Группы
  'groups:read',
  'groups:write',
  'groups:delete',
  'groups:manage',
  'groups:invite',
  
  // Устройства
  'devices:read',
  'devices:write',
  'devices:delete',
  'devices:manage',
  'devices:bind',
  
  // Система
  'system:admin',
  'system:audit',
]);

/**
 * Схема для контекста пользователя
 */
export const UserContextSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  email: z.string().email().describe('Email пользователя'),
  name: z.string().describe('Имя пользователя'),
  roles: z.array(SystemRoleEnum).describe('Роли пользователя'),
  organizationId: z.string().uuid().nullable().optional().describe('ID организации'),
  groupIds: z.array(z.string().uuid()).optional().describe('ID групп'),
  permissions: z.array(PermissionEnum).describe('Разрешения пользователя'),
});

/**
 * Схема для проверки прав доступа
 */
export const AccessCheckSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  resource: z.string().describe('Ресурс (например, "device", "organization")'),
  resourceId: z.string().describe('ID ресурса'),
  action: z.string().describe('Действие (например, "read", "write", "delete")'),
  context: z.record(z.unknown()).optional().describe('Дополнительный контекст'),
});

/**
 * Схема результата проверки прав доступа
 */
export const AccessResultSchema = z.object({
  allowed: z.boolean().describe('Разрешен ли доступ'),
  reason: z.string().optional().describe('Причина запрета (если доступ запрещен)'),
  requiredPermissions: z.array(PermissionEnum).optional().describe('Необходимые разрешения'),
});

/**
 * Схема для синхронизации пользователя с Keycloak
 */
export const KeycloakUserSyncSchema = z.object({
  keycloakUserId: z.string().uuid().describe('ID пользователя в Keycloak'),
  email: z.string().email().describe('Email'),
  firstName: z.string().optional().describe('Имя'),
  lastName: z.string().optional().describe('Фамилия'),
  username: z.string().optional().describe('Имя пользователя'),
  enabled: z.boolean().describe('Активен ли пользователь'),
  attributes: z.record(z.array(z.string())).optional().describe('Атрибуты Keycloak'),
});

/**
 * Типы TypeScript
 */
export type SystemRole = z.infer<typeof SystemRoleEnum>;
export type Permission = z.infer<typeof PermissionEnum>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type AccessCheck = z.infer<typeof AccessCheckSchema>;
export type AccessResult = z.infer<typeof AccessResultSchema>;
export type KeycloakUserSync = z.infer<typeof KeycloakUserSyncSchema>;
