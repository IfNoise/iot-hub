import { z } from 'zod';

/**
 * Схема для проверки разрешений
 */
export const PermissionCheckSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  permissions: z.array(z.string()).describe('Требуемые разрешения'),
  organizationId: z.string().uuid().optional().describe('ID организации'),
  groupId: z.string().uuid().optional().describe('ID группы'),
  resourceId: z.string().optional().describe('ID ресурса'),
});

/**
 * Схема для проверки ролей
 */
export const RoleCheckSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  roles: z.array(z.string()).describe('Требуемые роли'),
  organizationId: z.string().uuid().optional().describe('ID организации'),
});

/**
 * Схема контекста ACM
 */
export const ACMContextSchema = z.object({
  organizationId: z.string().uuid().optional().describe('ID организации'),
  groupId: z.string().uuid().optional().describe('ID группы'),
  resourceId: z.string().optional().describe('ID ресурса'),
});

/**
 * Схема запроса получения разрешений
 */
export const GetPermissionsRequestSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  context: ACMContextSchema.optional().describe('Контекст запроса'),
});

/**
 * Схема ответа с разрешениями
 */
export const GetPermissionsResponseSchema = z.object({
  permissions: z.array(z.string()).describe('Список разрешений'),
});

// Переиспользуем схемы из @iot-hub/acm-contracts
export {
  AccessCheckSchema,
  AccessResultSchema,
  type AccessCheck,
  type AccessResult,
} from '@iot-hub/acm-contracts';

/**
 * Типы через z.infer
 */
export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
export type RoleCheck = z.infer<typeof RoleCheckSchema>;
export type ACMContext = z.infer<typeof ACMContextSchema>;
export type GetPermissionsRequest = z.infer<typeof GetPermissionsRequestSchema>;
export type GetPermissionsResponse = z.infer<typeof GetPermissionsResponseSchema>;
