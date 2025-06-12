// src/common/middleware/middleware.module.ts
import { Module } from '@nestjs/common';
import { KeycloakOAuth2Middleware } from './keycloak-oauth2.middleware';
import { KeycloakUserService } from '../services/keycloak-user.service';
import { ConfigModule } from '../../config/config.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [KeycloakOAuth2Middleware, KeycloakUserService],
  exports: [KeycloakOAuth2Middleware, KeycloakUserService],
})
export class MiddlewareModule {}
