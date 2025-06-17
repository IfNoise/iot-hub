// src/auth/auth.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guard/roles-guard.guard';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface';
import { KeycloakUserService } from '../common/services/keycloak-user.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly keycloakUserService: KeycloakUserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 401, description: 'Пользователь не аутентифицирован' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const enrichedUser = await this.keycloakUserService.getEnrichedUserInfo(
      user
    );
    return {
      message: 'Профиль пользователя получен успешно',
      data: enrichedUser,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Получить базовую информацию о пользователе' })
  @ApiResponse({ status: 200, description: 'Информация о пользователе' })
  getUserInfo(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  @Get('admin')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Эндпоинт только для администраторов' })
  @ApiResponse({ status: 200, description: 'Доступ разрешен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  adminOnly(@CurrentUser('email') email: string) {
    return {
      message: 'Добро пожаловать, администратор!',
      admin: email,
    };
  }

  @Get('user')
  @Roles('user', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Эндпоинт для пользователей и администраторов' })
  @ApiResponse({ status: 200, description: 'Доступ разрешен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  userOrAdmin(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Привет, пользователь!',
      user: {
        name: user.name,
        role: user.role,
      },
    };
  }
}
