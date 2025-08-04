import { z } from 'zod';

/**
 * Схемы для интеграции с Keycloak
 */

/**
 * Пользователь Keycloak (Raw API Response)
 */
export const KeycloakUserSchema = z.object({
  id: z.string().describe('ID пользователя в Keycloak'),
  username: z.string().describe('Имя пользователя'),
  email: z.string().email().describe('Email'),
  firstName: z.string().optional().describe('Имя'),
  lastName: z.string().optional().describe('Фамилия'),
  enabled: z.boolean().describe('Активен ли пользователь'),
  emailVerified: z.boolean().describe('Подтвержден ли email'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты пользователя'),
  groups: z.array(z.string()).optional().describe('Группы пользователя'),
  realmRoles: z.array(z.string()).optional().describe('Роли realm'),
  clientRoles: z
    .record(z.array(z.string()))
    .optional()
    .describe('Роли клиента'),
  createdTimestamp: z.number().optional().describe('Время создания'),
});

/**
 * Группа Keycloak (Raw API Response)
 */
export const KeycloakGroupSchema: z.ZodType<{
  id: string;
  name: string;
  path: string;
  parentId?: string;
  attributes?: Record<string, string[]>;
  subGroups?: Array<{
    id: string;
    name: string;
    path: string;
    parentId?: string;
    attributes?: Record<string, string[]>;
    subGroups?: unknown[];
    realmRoles?: string[];
    clientRoles?: Record<string, string[]>;
  }>;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
}> = z.object({
  id: z.string().describe('ID группы в Keycloak'),
  name: z.string().describe('Название группы'),
  path: z.string().describe('Путь группы'),
  parentId: z.string().optional().describe('ID родительской группы'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты группы'),
  subGroups: z
    .array(z.lazy(() => KeycloakGroupSchema))
    .optional()
    .describe('Подгруппы'),
  realmRoles: z.array(z.string()).optional().describe('Роли realm'),
  clientRoles: z
    .record(z.array(z.string()))
    .optional()
    .describe('Роли клиента'),
});

/**
 * Роль Keycloak
 */
export const KeycloakRoleSchema = z.object({
  id: z.string().describe('ID роли'),
  name: z.string().describe('Название роли'),
  description: z.string().optional().describe('Описание роли'),
  composite: z.boolean().optional().describe('Составная роль'),
  clientRole: z.boolean().optional().describe('Роль клиента'),
  containerId: z.string().optional().describe('ID контейнера'),
});

/**
 * Схема для создания пользователя в Keycloak
 */
export const CreateKeycloakUserSchema = z.object({
  username: z.string().min(1).describe('Имя пользователя'),
  email: z.string().email().describe('Email'),
  firstName: z.string().optional().describe('Имя'),
  lastName: z.string().optional().describe('Фамилия'),
  enabled: z.boolean().default(true).describe('Активен ли пользователь'),
  emailVerified: z.boolean().default(false).describe('Подтвержден ли email'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты пользователя'),
  temporaryPassword: z.string().optional().describe('Временный пароль'),
  requiredActions: z
    .array(z.string())
    .optional()
    .describe('Обязательные действия'),
});

/**
 * Схема для обновления пользователя в Keycloak
 */
export const UpdateKeycloakUserSchema = z.object({
  firstName: z.string().optional().describe('Имя'),
  lastName: z.string().optional().describe('Фамилия'),
  enabled: z.boolean().optional().describe('Активен ли пользователь'),
  emailVerified: z.boolean().optional().describe('Подтвержден ли email'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты пользователя'),
});

/**
 * Схема для создания группы в Keycloak
 */
export const CreateKeycloakGroupSchema = z.object({
  name: z.string().min(1).describe('Название группы'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты группы'),
  parentId: z.string().optional().describe('ID родительской группы'),
});

/**
 * Схема для обновления группы в Keycloak
 */
export const UpdateKeycloakGroupSchema = z.object({
  name: z.string().optional().describe('Название группы'),
  attributes: z
    .record(z.array(z.string()))
    .optional()
    .describe('Атрибуты группы'),
});

/**
 * Схема токена Keycloak
 */
export const KeycloakTokenSchema = z.object({
  access_token: z.string().describe('Access token'),
  expires_in: z.number().describe('Время жизни токена в секундах'),
  refresh_expires_in: z
    .number()
    .optional()
    .describe('Время жизни refresh токена'),
  refresh_token: z.string().optional().describe('Refresh token'),
  token_type: z.string().default('Bearer').describe('Тип токена'),
  'not-before-policy': z.number().optional(),
  session_state: z.string().optional().describe('Состояние сессии'),
  scope: z.string().optional().describe('Область действия'),
});

/**
 * Схема для запроса токена через service account
 */
export const ServiceAccountTokenRequestSchema = z.object({
  grant_type: z.literal('client_credentials').default('client_credentials'),
  client_id: z.string().min(1).describe('ID клиента'),
  client_secret: z.string().min(1).describe('Секрет клиента'),
  scope: z.string().optional().describe('Область действия'),
});

// Экспорт типов
export type KeycloakUser = z.infer<typeof KeycloakUserSchema>;
export type KeycloakGroup = z.infer<typeof KeycloakGroupSchema>;
export type KeycloakRole = z.infer<typeof KeycloakRoleSchema>;
export type CreateKeycloakUser = z.infer<typeof CreateKeycloakUserSchema>;
export type UpdateKeycloakUser = z.infer<typeof UpdateKeycloakUserSchema>;
export type CreateKeycloakGroup = z.infer<typeof CreateKeycloakGroupSchema>;
export type UpdateKeycloakGroup = z.infer<typeof UpdateKeycloakGroupSchema>;
export type KeycloakToken = z.infer<typeof KeycloakTokenSchema>;
export type ServiceAccountTokenRequest = z.infer<
  typeof ServiceAccountTokenRequestSchema
>;
