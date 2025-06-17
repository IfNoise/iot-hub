import { Module } from '@nestjs/common';
import { KeycloakOAuth2Middleware } from './keycloak-oauth2.middleware';
import { AutoUserSyncMiddleware } from './auto-user-sync.middleware';
import { KeycloakUserService } from '../services/keycloak-user.service';
import { ConfigModule } from '../../config/config.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    KeycloakOAuth2Middleware,
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
