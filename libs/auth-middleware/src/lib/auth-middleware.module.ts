import { Module, DynamicModule } from '@nestjs/common';
import { JwtService } from './services/jwt.service.js';
import { ACMClientService } from './services/acm-client.service.js';
import { JwtAuthMiddleware } from './middleware/jwt-auth.middleware.js';
import { RbacMiddleware } from './middleware/rbac.middleware.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import {
  AuthMiddlewareConfigSchema,
  type AuthMiddlewareConfig,
} from './schemas/index.js';

@Module({})
export class AuthMiddlewareModule {
  static forRoot(config: AuthMiddlewareConfig): DynamicModule {
    // Валидация конфигурации через Zod
    const validatedConfig = AuthMiddlewareConfigSchema.parse(config);

    return {
      module: AuthMiddlewareModule,
      providers: [
        {
          provide: 'AUTH_MIDDLEWARE_CONFIG',
          useValue: validatedConfig,
        },
        {
          provide: JwtService,
          useFactory: (cfg: AuthMiddlewareConfig) => new JwtService(cfg.jwt),
          inject: ['AUTH_MIDDLEWARE_CONFIG'],
        },
        {
          provide: ACMClientService,
          useFactory: (cfg: AuthMiddlewareConfig) => new ACMClientService(cfg),
          inject: ['AUTH_MIDDLEWARE_CONFIG'],
        },
        {
          provide: JwtAuthMiddleware,
          useFactory: (cfg: AuthMiddlewareConfig) => new JwtAuthMiddleware(cfg),
          inject: ['AUTH_MIDDLEWARE_CONFIG'],
        },
        {
          provide: RbacMiddleware,
          useFactory: (cfg: AuthMiddlewareConfig) => new RbacMiddleware(cfg),
          inject: ['AUTH_MIDDLEWARE_CONFIG'],
        },
        PermissionsGuard,
        RolesGuard,
      ],
      exports: [
        'AUTH_MIDDLEWARE_CONFIG',
        JwtService,
        ACMClientService,
        JwtAuthMiddleware,
        RbacMiddleware,
        PermissionsGuard,
        RolesGuard,
      ],
      global: true,
    };
  }
}
