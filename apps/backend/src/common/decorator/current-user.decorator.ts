// src/common/decorator/current-user.decorator.ts
import { User } from '@iot-hub/users';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator для получения текущего аутентифицированного пользователя
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return { user };
 * }
 *
 * // Получить только определенное поле
 * @Get('profile')
 * getProfile(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    return data ? user?.[data] : user;
  }
);
