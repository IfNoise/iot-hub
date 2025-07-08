import { z } from 'zod';

/**
 * Схема организации
 */
export const OrganizationSchema = z
  .object({
    id: z.string().uuid().describe('Уникальный ID организации'),
    name: z.string().min(1).max(200).describe('Название организации'),
    description: z.string().optional().describe('Описание организации'),
    logo: z.string().url().optional().describe('URL логотипа'),
    domain: z.string().optional().describe('Домен организации'),
    plan: z
      .enum(['enterprise', 'business'])
      .default('business')
      .describe('Тариф организации'),
    maxUsers: z
      .number()
      .positive()
      .default(100)
      .describe('Максимальное количество пользователей'),
    maxDevices: z
      .number()
      .positive()
      .default(1000)
      .describe('Максимальное количество устройств'),
    isActive: z.boolean().default(true).describe('Статус активности'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата создания'),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата обновления'),
    metadata: z.record(z.any()).optional().describe('Дополнительные данные'),
  })
  .strict();

/**
 * Схема группы внутри организации
 */
export const GroupSchema = z
  .object({
    id: z.string().uuid().describe('Уникальный ID группы'),
    organizationId: z.string().uuid().describe('ID организации'),
    name: z.string().min(1).max(100).describe('Название группы'),
    description: z.string().optional().describe('Описание группы'),
    parentGroupId: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .describe('ID родительской группы'),
    isActive: z.boolean().default(true).describe('Статус активности'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата создания'),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Дата обновления'),
    metadata: z.record(z.any()).optional().describe('Дополнительные данные'),
  })
  .strict();

/**
 * DTO для создания организации
 */
export const CreateOrganizationSchema = OrganizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * DTO для обновления организации
 */
export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();

/**
 * DTO для создания группы
 */
export const CreateGroupSchema = GroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * DTO для обновления группы
 */
export const UpdateGroupSchema = CreateGroupSchema.partial();

/**
 * Схема для запроса списка организаций
 */
export const OrganizationQuerySchema = z.object({
  page: z.number().min(1).default(1).describe('Номер страницы'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Количество элементов'),
  search: z.string().optional().describe('Поиск по названию'),
  isActive: z.boolean().optional().describe('Фильтр по активности'),
});

/**
 * Схема для запроса списка групп
 */
export const GroupQuerySchema = z.object({
  page: z.number().min(1).default(1).describe('Номер страницы'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe('Количество элементов'),
  organizationId: z.string().uuid().optional().describe('ID организации'),
  parentGroupId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('ID родительской группы'),
  search: z.string().optional().describe('Поиск по названию'),
  isActive: z.boolean().optional().describe('Фильтр по активности'),
});

/**
 * Типы TypeScript
 */
export type Organization = z.infer<typeof OrganizationSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>;

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;
export type GroupQuery = z.infer<typeof GroupQuerySchema>;
