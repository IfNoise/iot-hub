import { z } from "zod";

/**
 * Перечисления
 */
export const UserRoleEnum = z.enum(["admin", "user"]);
export const PlanTypeEnum = z.enum(["free", "pro"]);

/**
 * Базовая схема пользователя
 */
export const UserBaseSchema = z
  .object({
    id: z.string().uuid().describe("Уникальный ID пользователя"),
    email: z.string().email().describe("Электронная почта"),
    name: z
      .string()
      .min(2)
      .max(100)
      .transform((v) => v.trim())
      .describe("Имя пользователя"),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe("Дата создания"),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe("Дата обновления"),
    role: UserRoleEnum.default("user").describe("Роль пользователя"),
    ballance: z
      .number()
      .nonnegative()
      .default(0)
      .describe("Баланс пользователя"),
    plan: PlanTypeEnum.default("free").describe("Тип подписки"),
    planExpiresAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe("Дата окончания подписки"),
    metadata: z.record(z.any()).optional().describe("Произвольные данные"),
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
    .preprocess((v) => (v ? new Date(v as string) : undefined), z.date())
    .optional()
    .describe("Дата окончания подписки"),
});

/**
 * DTO: Update
 */
export const UpdateUserSchema = CreateUserSchema.partial();
