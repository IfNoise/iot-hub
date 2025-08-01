import { z } from 'zod';

/**
 * Перечисления
 */
export const UserRoleEnum = z.enum([
  'admin',
  'personal-user',
  'organization-user',
  'group-user',
  'organization-admin',
  'group-admin',
  'organization-owner',
]);
export const PlanTypeEnum = z.enum(['free', 'pro', 'enterprise']);
export const UserTypeEnum = z.enum(['individual', 'organization']);

/**
 * Базовая схема пользователя
 */
export const UserBaseSchema = z
  .object({
    id: z.string().uuid().describe('Уникальный идентификатор пользователя'),
    userId: z.string().uuid().describe('Keycloak ID пользователя'),
    email: z.string().email().describe('Электронная почта'),
    name: z
      .string()
      .min(2)
      .max(32)
      .transform((v) => v.trim())
      .describe('Имя пользователя'),
    avatar: z.string().url().optional().describe('URL аватара пользователя'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата создания'),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата обновления'),
    roles: z
      .array(UserRoleEnum)
      .default(['personal-user'])
      .describe('Роли пользователя'),
    balance: z
      .number()
      .nonnegative()
      .default(0)
      .describe('Баланс пользователя'),
    plan: PlanTypeEnum.default('free').describe('Тип подписки'),
    planExpiresAt: z
      .preprocess((v) => (v ? new Date(v as string) : null), z.date())
      .optional()
      .describe('Дата окончания подписки'),
    accountType: UserTypeEnum.default('individual').describe('Тип аккаунта'),
    // Enterprise поля (опциональные для обратной совместимости)
    organizationId: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .describe('ID организации'),
    groups: z
      .array(z.string())
      .optional()
      .nullable()
      .describe('Список ID групп пользователя'),
    metadata: z.record(z.any()).optional().describe('Произвольные данные'),
  })
  .strict();

/**
 * DTO: Create
 */
export const CreateUserSchema = UserBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  planExpiresAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .optional()
    .describe('Дата окончания подписки'),
});

/**
 * DTO: Update
 */
export const UpdateUserSchema = CreateUserSchema.partial();

/**
 * DTO: Query параметры для поиска пользователей
 */
export const UserQuerySchema = z.object({
  page: z.number().min(1).default(1).describe('Номер страницы'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Количество элементов на странице'),
  role: UserRoleEnum.optional().describe('Фильтр по роли'),
  plan: PlanTypeEnum.optional().describe('Фильтр по типу подписки'),
  search: z.string().optional().describe('Поиск по имени или email'),
});

/**
 * Схема ответа со списком пользователей
 */
export const UsersListResponseSchema = z.object({
  users: z.array(UserBaseSchema).describe('Список пользователей'),
  total: z.number().describe('Общее количество пользователей'),
  page: z.number().describe('Текущая страница'),
  limit: z.number().describe('Количество элементов на странице'),
  totalPages: z.number().describe('Общее количество страниц'),
});

/**
 * Типы TypeScript
 */
export type User = z.infer<typeof UserBaseSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;
export type UserRole = z.infer<typeof UserRoleEnum>;
export type PlanType = z.infer<typeof PlanTypeEnum>;
export type UserType = z.infer<typeof UserTypeEnum>;
