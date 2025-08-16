import { z } from 'zod';
import { UserRoleEnum } from '@iot-hub/users';

/**
 * Конфигурация JWT
 */
export const JWTConfigSchema = z.object({
  issuer: z.string().url().describe('JWT issuer URL'),
  audience: z.string().optional().describe('JWT audience'),
  jwksUri: z.string().url().describe('JWKS endpoint URL'),
});

/**
 * Схема аутентифицированного пользователя
 */
export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid().describe('Внутренний ID пользователя'),
  userId: z.string().uuid().describe('Keycloak ID пользователя'),
  email: z.string().email().describe('Email пользователя'),
  name: z.string().describe('Имя пользователя'),
  avatar: z.string().url().optional().describe('URL аватара'),
  roles: z.array(UserRoleEnum).describe('Роли пользователя'),
  permissions: z.array(z.string()).describe('Разрешения пользователя'),
  organizationId: z.string().uuid().optional().describe('ID организации'),
  groupIds: z.array(z.string().uuid()).optional().describe('ID групп'),
  sessionId: z.string().optional().describe('ID сессии'),
  tokenExp: z.number().describe('Время истечения токена'),
  metadata: z.record(z.any()).optional().describe('Дополнительные данные'),
});

/**
 * Схема базового пользователя (без permissions)
 */
export const BaseUserSchema = AuthenticatedUserSchema.omit({
  permissions: true,
});

/**
 * Типы через z.infer - НЕ создаем интерфейсы вручную
 */
export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
export type BaseUser = z.infer<typeof BaseUserSchema>;

// Переэкспорт токена для удобства
export { TokenPayloadSchema, type TokenPayload } from '@iot-hub/auth';
