// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { MiddlewareModule } from '../common/middleware/middleware.module.js';
import { KeycloakAdminService } from './services/keycloak-admin.service.js';
import { AuthConfigService } from './config/auth-config.service.js';

@Module({
  imports: [MiddlewareModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthConfigService,
      useFactory: () => {
        try {
          return new AuthConfigService(process.env);
        } catch (error) {
          console.error('Failed to create AuthConfigService:', error);
          // Создаем с значениями по умолчанию для разработки
          return new AuthConfigService({
            JWT_SECRET: 'development-jwt-secret-key-at-least-32-chars',
            JWT_EXPIRATION: '1h',
            KEYCLOAK_URL: 'http://localhost:8080',
            KEYCLOAK_REALM: 'iot-hub',
            KEYCLOAK_CLIENT_ID: 'iot-hub-backend',
            KEYCLOAK_CLIENT_SECRET: 'development-secret',
            KEYCLOAK_ADMIN_USERNAME: 'admin',
            KEYCLOAK_ADMIN_PASSWORD: 'admin',
            OAUTH2_PROXY_USER_HEADER: 'X-Auth-Request-User',
            OAUTH2_PROXY_EMAIL_HEADER: 'X-Auth-Request-Email',
            OAUTH2_PROXY_PREFERRED_USERNAME_HEADER:
              'X-Auth-Request-Preferred-Username',
            OAUTH2_PROXY_ACCESS_TOKEN_HEADER: 'X-Auth-Request-Access-Token',
            DEV_USER_ID: 'dev-user-123',
            DEV_USER_EMAIL: 'dev@example.com',
            DEV_USER_NAME: 'Dev User',
            DEV_USER_ROLE: 'admin',
            DEV_USER_AVATAR: '',
            DEV_USER_EMAIL_VERIFIED: 'true',
          });
        }
      },
    },
    KeycloakAdminService,
  ],
  exports: [KeycloakAdminService, AuthConfigService],
})
export class AuthModule {}
