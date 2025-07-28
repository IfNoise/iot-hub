import { Module } from '@nestjs/common';
import { KeycloakOAuth2Middleware } from './keycloak-oauth2.middleware.js';
import { AutoUserSyncMiddleware } from './auto-user-sync.middleware.js';
import { KeycloakUserService } from '../services/keycloak-user.service.js';
import { ConfigModule } from '../../config/config.module.js';
import { UsersModule } from '../../users/users.module.js';
import { KeycloakAdminService } from '../../auth/services/keycloak-admin.service.js';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    KeycloakOAuth2Middleware,
    KeycloakAdminService,
    AutoUserSyncMiddleware,
    KeycloakUserService,
  ],
  exports: [
    KeycloakOAuth2Middleware,
    AutoUserSyncMiddleware,
    KeycloakUserService,
  ],
})
export class MiddlewareModule {}
