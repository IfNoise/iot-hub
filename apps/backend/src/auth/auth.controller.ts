// src/auth/auth.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { CurrentUser } from '../common/decorator/current-user.decorator.js';
import { Roles } from '../common/decorator/roles.decorator.js';
import { RolesGuard } from '../common/guard/roles-guard.guard.js';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface.js';
import { KeycloakUserService } from '../common/services/keycloak-user.service.js';
import { authContract } from '@iot-hub/auth';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly keycloakUserService: KeycloakUserService) {}

  @TsRestHandler(authContract.getProfile)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(authContract.getProfile, async () => {
      try {
        const enrichedUser = await this.keycloakUserService.getEnrichedUserInfo(
          user
        );
        return {
          status: 200 as const,
          body: {
            message: 'Профиль пользователя получен успешно',
            data: enrichedUser,
          },
        };
      } catch {
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
  getUserInfo(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(authContract.getUserInfo, async () => {
      try {
        return {
          status: 200 as const,
          body: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
        };
      } catch {
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
        return {
          status: 200 as const,
          body: {
            message: 'Добро пожаловать, администратор!',
            admin: email,
          },
        };
      } catch {
        return {
          status: 403 as const,
          body: {
            message: 'Недостаточно прав',
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.userOrAdmin)
  @Roles('user', 'admin')
  @UseGuards(RolesGuard)
  userOrAdmin(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(authContract.userOrAdmin, async () => {
      try {
        return {
          status: 200 as const,
          body: {
            message: 'Привет, пользователь!',
            user: {
              name: user.name,
              role: user.role,
            },
          },
        };
      } catch {
        return {
          status: 403 as const,
          body: {
            message: 'Недостаточно прав',
          },
        };
      }
    });
  }
}
