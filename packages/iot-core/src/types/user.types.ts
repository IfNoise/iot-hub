import { z } from "zod";
import {
  UserBaseSchema,
  CreateUserSchema,
  UpdateUserSchema,
} from "../schemas/user.schemas";

/**
 * Типы
 */
export type User = z.infer<typeof UserBaseSchema>;
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
