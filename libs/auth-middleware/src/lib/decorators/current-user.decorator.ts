import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserSchema } from '../schemas/index.js';
import type { AuthenticatedUser } from '../schemas/index.js';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Валидация через Zod схему
    const parseResult = AuthenticatedUserSchema.safeParse(request.user);
    if (!parseResult.success) {
      throw new Error('Invalid authenticated user data');
    }

    const user = parseResult.data;
    return data ? user[data] : user;
  }
);
