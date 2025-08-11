import { z } from 'zod';

/**
 * Схемы для управления группами
 */

/**
 * Базовая схема группы
 */
export const GroupBaseSchema = z.object({
  id: z.string().uuid().describe('Уникальный идентификатор группы'),
  name: z.string().min(2).max(100).describe('Название группы'),
  description: z.string().max(500).optional().describe('Описание группы'),
  organizationId: z.string().uuid().describe('ID организации'),
  parentGroupId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('ID родительской группы'),
  isActive: z.boolean().default(true).describe('Активна ли группа'),
  createdAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Дата создания'),
  updatedAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Дата обновления'),
  createdBy: z.string().uuid().describe('ID создателя'),
  metadata: z.record(z.unknown()).optional().describe('Дополнительные данные'),
});

/**
 * Схема для создания группы
 */
export const CreateGroupSchema = GroupBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Схема для обновления группы
 */
export const UpdateGroupSchema = CreateGroupSchema.partial().omit({
  organizationId: true,
  createdBy: true,
});

/**
 * Схема участника группы
 */
export const GroupMemberSchema = z.object({
  id: z.string().uuid().describe('ID записи'),
  groupId: z.string().uuid().describe('ID группы'),
  userId: z.string().uuid().describe('ID пользователя'),
  role: z.enum(['member', 'admin']).default('member').describe('Роль в группе'),
  joinedAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Дата присоединения'),
  invitedBy: z.string().uuid().describe('ID пригласившего'),
});

/**
 * Схема для добавления пользователя в группу
 */
export const AddGroupMemberSchema = z.object({
  userId: z.string().uuid().describe('ID пользователя'),
  role: z.enum(['member', 'admin']).default('member').describe('Роль в группе'),
});

/**
 * Схема для обновления роли участника группы
 */
export const UpdateGroupMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin']).describe('Новая роль в группе'),
});

/**
 * Схема для запроса списка групп
 */
export const GroupQuerySchema = z.object({
  page: z.string().optional().describe('Номер страницы'),
  limit: z.string().optional().describe('Количество элементов на странице'),
  organizationId: z
    .string()
    .uuid()
    .optional()
    .describe('Фильтр по организации'),
  parentGroupId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Фильтр по родительской группе'),
  search: z.string().optional().describe('Поиск по названию или описанию'),
  isActive: z.boolean().optional().describe('Фильтр по активности'),
});

/**
 * Типы TypeScript
 */
export type Group = z.infer<typeof GroupBaseSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;
export type GroupMember = z.infer<typeof GroupMemberSchema>;
export type AddGroupMember = z.infer<typeof AddGroupMemberSchema>;
export type UpdateGroupMemberRole = z.infer<typeof UpdateGroupMemberRoleSchema>;
export type GroupQuery = z.infer<typeof GroupQuerySchema>;
