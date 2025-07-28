// src/auth/auth.controller.ts
import { Controller, UseGuards, Query, Res, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { CurrentUser } from '../common/decorator/current-user.decorator.js';
import { Roles } from '../common/decorator/roles.decorator.js';
import { RolesGuard } from '../common/guard/roles-guard.guard.js';
import { KeycloakUserService } from '../common/services/keycloak-user.service.js';
import { authContract } from '@iot-hub/auth';
import type { AuthProfile, AuthUserInfo } from '@iot-hub/auth';
import type { Response } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import type { User } from '@iot-hub/users';


interface CallbackQuery {
  code?: string;
  state?: string;
  session_state?: string;
  iss?: string;
  error?: string;
  error_description?: string;
}

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private readonly keycloakUserService: KeycloakUserService,
    @InjectPinoLogger(AuthController.name) private readonly logger: PinoLogger
  ) {}

  @TsRestHandler(authContract.getProfile)
  async getProfile(@CurrentUser() user: User) {
    return tsRestHandler(authContract.getProfile, async () => {
      try {
        const enrichedUser = await this.keycloakUserService.getEnrichedUserInfo(
          user
        );
        this.logger.debug('Пользователь успешно обогащён:', enrichedUser);
        return {
          status: 200 as const,
          body: {
            message: 'Профиль пользователя получен успешно',
            data: enrichedUser,
          } as AuthProfile,
        };
      } catch {
        this.logger.error('Ошибка при получении профиля пользователя');
        return {
          status: 401 as const,
          body: {
            message: 'Пользователь не аутентифицирован',
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.getUserInfo)
  getUserInfo(@CurrentUser() user: User) {
    return tsRestHandler(authContract.getUserInfo, async () => {
      try {
        this.logger.debug('Получение информации о пользователе:', user.email);
        return {
          status: 200 as const,
          body: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            roles: user.roles,
          } as AuthUserInfo,
        };
      } catch (error) {
        this.logger.error(
          error,
          'Ошибка при получении информации о пользователе'
        );
        return {
          status: 401 as const,
          body: {
            message: 'Пользователь не аутентифицирован',
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.adminOnly)
  @Roles('admin')
  @UseGuards(RolesGuard)
  adminOnly(@CurrentUser('email') email: string) {
    return tsRestHandler(authContract.adminOnly, async () => {
      try {
        this.logger.debug('Проверка доступа администратора:', email);
        return {
          status: 200 as const,
          body: {
            message: 'Добро пожаловать, администратор!',
            admin: email,
          },
        };
      } catch (error) {
        this.logger.error(error, 'Ошибка доступа администратора:');
        return {
          status: 403 as const,
          body: {
            message: 'Недостаточно прав',
          },
        };
      }
    });
  }

  // Temporary simple callback endpoint for testing
  @Get('callback')
  async handleCallbackSimple(
    @Query() query: CallbackQuery,
    @Res() res: Response
  ) {
    try {
      this.logger.debug('OAuth callback received:', query);

      // Если есть ошибка от Keycloak
      if (query.error) {
        this.logger.error('OAuth error:', query.error, query.error_description);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        return res.redirect(
          `${frontendUrl}/auth/error?error=${encodeURIComponent(
            query.error
          )}&description=${encodeURIComponent(query.error_description || '')}`
        );
      }

      // Если нет кода авторизации
      if (!query.code) {
        this.logger.error('No authorization code received');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        return res.redirect(`${frontendUrl}/auth/error?error=no_code`);
      }

      // В реальном приложении здесь должен быть обмен кода на токен
      // Пока просто перенаправляем на frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

      // Перенаправляем на frontend с параметрами
      return res.redirect(
        `${frontendUrl}/auth/success?code=${encodeURIComponent(
          query.code
        )}&session_state=${encodeURIComponent(
          query.session_state || ''
        )}&state=${encodeURIComponent(query.state || '')}`
      );
    } catch (error) {
      this.logger.error('Callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/auth/error?error=callback_error`);
    }
  }
}
