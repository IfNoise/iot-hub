import { Module } from '@nestjs/common';
import { KeycloakOAuth2Middleware } from './keycloak-oauth2.middleware.js';
import { AutoUserSyncMiddleware } from './auto-user-sync.middleware.js';
import { KeycloakUserService } from '../services/keycloak-user.service.js';
import { ConfigModule } from '../../config/config.module.js';
import { AuthConfigService } from '../../auth/config/auth-config.service.js';
import { UsersModule } from '../../users/users.module.js';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    AuthConfigService,
    KeycloakOAuth2Middleware,
    AutoUserSyncMiddleware,
    KeycloakUserService,
  ],
  exports: [
    AuthConfigService,
    KeycloakOAuth2Middleware,
    AutoUserSyncMiddleware,
    KeycloakUserService,
  ],
})
export class MiddlewareModule {}
