import { z } from 'zod';

/**
 * Схема для проверки прав доступа к устройству
 */
export const DeviceAccessSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  deviceId: z.string().describe('ID устройства'),
  operation: z
    .enum(['read', 'write', 'bind', 'manage'])
    .describe('Тип операции'),
});

/**
 * Схема для проверки прав доступа к организации
 */
export const OrganizationAccessSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  organizationId: z.string().uuid().describe('ID организации'),
  operation: z
    .enum(['read', 'write', 'manage', 'admin'])
    .describe('Тип операции'),
});

/**
 * Схема для проверки прав доступа к группе
 */
export const GroupAccessSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  groupId: z.string().uuid().describe('ID группы'),
  operation: z.enum(['read', 'write', 'manage']).describe('Тип операции'),
});

/**
 * Схема для контекста авторизации
 */
export const AuthContextSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  userType: z.enum(['individual', 'organization']).describe('Тип пользователя'),
  role: z
    .enum(['admin', 'user', 'org_admin', 'group_admin'])
    .describe('Роль пользователя'),
  organizationId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('ID организации'),
  groupId: z.string().uuid().nullable().optional().describe('ID группы'),
  permissions: z.array(z.string()).describe('Список разрешений'),
});

/**
 * Типы TypeScript
 */
export type DeviceAccess = z.infer<typeof DeviceAccessSchema>;
export type OrganizationAccess = z.infer<typeof OrganizationAccessSchema>;
export type GroupAccess = z.infer<typeof GroupAccessSchema>;
export type AuthContext = z.infer<typeof AuthContextSchema>;
