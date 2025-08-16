# 📋 Техническое задание: Создание библиотеки RBAC-middleware для микросервисов

## 🎯 Цель

Создать переиспользуемую библиотеку `@iot-hub/auth-middleware` для обеспечения единой системы аутентификации и авторизации (RBAC) во всех микросервисах, используя **Zod schemas**, **ts-rest contracts** и ACM как источник правды.

## 🏗 Архитектурные принципы

### ОБЯЗАТЕЛЬНЫЕ принципы

- ✅ **Contract First**: Все API через ts-rest контракты
- ✅ **Zod Only**: Валидация ИСКЛЮЧИТЕЛЬНО через Zod схемы
- ✅ **No Class-Validator**: Никаких `@IsEmail()`, `@IsString()` и т.д.
- ✅ **Type Safety**: `z.infer<typeof Schema>` вместо ручных интерфейсов
- ✅ **Schema Reuse**: Переиспользование существующих схем из `libs/contracts`

### ❌ ЗАПРЕЩЕНО

- `class-validator`, `class-transformer`
- `@nestjs/swagger`
- Ручные интерфейсы вместо `z.infer<>`
- DTO классы
- Дублирование схем

## 📦 Структура библиотеки

```
libs/auth-middleware/
├── src/
│   ├── lib/
│   │   ├── contracts/                      # ts-rest контракты
│   │   │   ├── auth-middleware.contract.ts
│   │   │   └── index.ts
│   │   ├── schemas/                        # Zod схемы
│   │   │   ├── auth-middleware.schemas.ts
│   │   │   ├── jwt.schemas.ts
│   │   │   ├── rbac.schemas.ts
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── jwt-auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── index.ts
│   │   ├── guards/
│   │   │   ├── permissions.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── index.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── require-permissions.decorator.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── acm-client.service.ts
│   │   │   ├── jwt.service.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
```

## 🔧 Zod Schemas

### 1. JWT Schemas (`jwt.schemas.ts`)

```typescript
import { z } from 'zod';
import { UserRoleEnum } from '@iot-hub/users';

// Переиспользуем существующую схему из @iot-hub/auth
import { TokenPayloadSchema } from '@iot-hub/auth';

export const JWTConfigSchema = z.object({
  issuer: z.string().url(),
  audience: z.string().optional(),
  jwksUri: z.string().url(),
});

export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().url().optional(),
  roles: z.array(UserRoleEnum),
  permissions: z.array(z.string()),
  organizationId: z.string().uuid().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
  sessionId: z.string().optional(),
  tokenExp: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Типы через z.infer - НЕ создаем интерфейсы вручную
export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
```

### 2. RBAC Schemas (`rbac.schemas.ts`)

```typescript
import { z } from 'zod';

export const PermissionCheckSchema = z.object({
  userId: z.string().uuid(),
  permissions: z.array(z.string()),
  organizationId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  resourceId: z.string().optional(),
});

export const RoleCheckSchema = z.object({
  userId: z.string().uuid(),
  roles: z.array(z.string()),
  organizationId: z.string().uuid().optional(),
});

export const ACMContextSchema = z.object({
  organizationId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  resourceId: z.string().optional(),
});

// Переиспользуем схемы из @iot-hub/acm-contracts
// import { AccessCheckSchema, AccessResultSchema } from '@iot-hub/acm-contracts';

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
export type RoleCheck = z.infer<typeof RoleCheckSchema>;
export type ACMContext = z.infer<typeof ACMContextSchema>;
```

### 3. Configuration Schema (`auth-middleware.schemas.ts`)

```typescript
import { z } from 'zod';

export const AuthMiddlewareConfigSchema = z.object({
  jwt: z.object({
    issuer: z.string().url(),
    audience: z.string().optional(),
    jwksUri: z.string().url(),
  }),
  acm: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().positive().default(5000),
    retryAttempts: z.number().min(1).max(5).default(3),
  }),
  cache: z
    .object({
      enabled: z.boolean().default(true),
      ttl: z.number().positive().default(300), // 5 минут
    })
    .optional(),
  development: z
    .object({
      enabled: z.boolean().default(false),
      mockUser: AuthenticatedUserSchema,
    })
    .optional(),
});

export type AuthMiddlewareConfig = z.infer<typeof AuthMiddlewareConfigSchema>;
```

## 🔗 ts-rest Contracts

### ACM Client Contract (`auth-middleware.contract.ts`)

```typescript
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AuthenticatedUserSchema,
  PermissionCheckSchema,
  ACMContextSchema,
} from '../schemas/index.js';

// Переиспользуем контракты из ACM
import { acmContract } from '@iot-hub/acm-contracts';

const c = initContract();

export const authMiddlewareContract = c.router({
  // Внутренний контракт для middleware
  validateToken: {
    method: 'POST',
    path: '/auth/validate-token',
    body: z.object({
      token: z.string(),
    }),
    responses: {
      200: AuthenticatedUserSchema,
      401: z.object({ message: z.string() }),
    },
  },

  enrichUserWithPermissions: {
    method: 'POST',
    path: '/auth/enrich-user',
    body: z.object({
      user: AuthenticatedUserSchema.omit({ permissions: true }),
      context: ACMContextSchema.optional(),
    }),
    responses: {
      200: AuthenticatedUserSchema,
      400: z.object({ message: z.string() }),
    },
  },
});

// Переиспользуем ACM контракты для получения permissions
export { acmContract as acmClient } from '@iot-hub/acm-contracts';

export type AuthMiddlewareContract = typeof authMiddlewareContract;
```

## 🛠 Middleware Implementation

### 1. JWT Auth Middleware

```typescript
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.js';
import { AuthenticatedUserSchema } from '../schemas/index.js';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractBearerToken(req);
      if (!token) {
        throw new UnauthorizedException('No Bearer token provided');
      }

      const payload = await this.jwtService.verifyToken(token);
      const user = this.jwtService.extractUserFromPayload(payload);

      // Валидация через Zod схему
      const validatedUser = AuthenticatedUserSchema.omit({
        permissions: true,
      }).parse(user);

      req.user = { ...validatedUser, permissions: [] };
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid JWT token');
    }
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
```

### 2. RBAC Middleware

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ACMClientService } from '../services/acm-client.service.js';
import { AuthenticatedUserSchema } from '../schemas/index.js';

@Injectable()
export class RbacMiddleware implements NestMiddleware {
  constructor(private readonly acmClient: ACMClientService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return next();
    }

    try {
      // Получаем permissions из ACM используя контракт
      const permissions = await this.acmClient.getUserPermissions(
        req.user.userId,
        {
          organizationId: req.user.organizationId,
          groupIds: req.user.groupIds,
        }
      );

      // Обогащаем пользователя permissions и валидируем
      const enrichedUser = AuthenticatedUserSchema.parse({
        ...req.user,
        permissions,
      });

      req.user = enrichedUser;
      next();
    } catch (error) {
      console.error('RBAC enrichment failed:', error);
      // Продолжаем с пустыми permissions вместо блокировки
      req.user = { ...req.user, permissions: [] };
      next();
    }
  }
}
```

## 🛡 Guards with Zod Validation

### Permissions Guard

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PermissionCheckSchema,
  AuthenticatedUserSchema,
} from '../schemas/index.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Валидация пользователя через Zod
    const parseResult = AuthenticatedUserSchema.safeParse(request.user);
    if (!parseResult.success) {
      throw new ForbiddenException('Invalid user data');
    }

    const user = parseResult.data;

    // Валидация permission check через Zod
    const permissionCheck = PermissionCheckSchema.parse({
      userId: user.userId,
      permissions: requiredPermissions,
      organizationId: user.organizationId,
    });

    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
```

## 🎨 Decorators with Zod

### Current User Decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserSchema } from '../schemas/index.js';
import type { AuthenticatedUser } from '../schemas/index.js';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Валидация через Zod схему
    const parseResult = AuthenticatedUserSchema.safeParse(request.user);
    if (!parseResult.success) {
      throw new Error('Invalid authenticated user data');
    }

    const user = parseResult.data;
    return data ? user[data] : user;
  }
);
```

## 🌐 ACM Client Service with ts-rest

```typescript
import { Injectable } from '@nestjs/common';
import { initClient } from '@ts-rest/core';
import { acmClient } from '../contracts/index.js';
import type { ACMContext } from '../schemas/index.js';

@Injectable()
export class ACMClientService {
  private client = initClient(acmClient, {
    baseUrl: this.config.acm.baseUrl,
    baseHeaders: {
      'Content-Type': 'application/json',
    },
  });

  constructor(
    @Inject('AUTH_MIDDLEWARE_CONFIG')
    private config: AuthMiddlewareConfig
  ) {}

  async getUserPermissions(
    userId: string,
    context?: ACMContext
  ): Promise<string[]> {
    const response = await this.client.getUserPermissions({
      params: { userId },
      query: {
        organizationId: context?.organizationId,
        groupId: context?.groupId,
      },
    });

    if (response.status === 200) {
      return response.body.permissions;
    }

    throw new Error(`Failed to get permissions: ${response.status}`);
  }

  async checkAccess(request: AccessCheckInput): Promise<AccessResult> {
    const response = await this.client.checkAccess({
      body: request,
    });

    if (response.status === 200) {
      return response.body;
    }

    throw new Error(`Access check failed: ${response.status}`);
  }
}
```

## 📋 Usage Examples

### Controller with Zod validation

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import {
  CurrentUser,
  RequirePermissions,
  RequireRoles,
} from '@iot-hub/auth-middleware';
import { usersContract, CreateUserSchema } from '@iot-hub/users'; // Zod схемы
import type { AuthenticatedUser } from '@iot-hub/auth-middleware';

@Controller()
@UseGuards(RolesGuard, PermissionsGuard)
export class UsersController {
  @TsRestHandler(usersContract.getUsers)
  @RequirePermissions('users:read')
  async getUsers(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(usersContract.getUsers, async () => {
      // user.permissions уже валидированы через Zod
      return {
        status: 200,
        body: await this.usersService.findAll(),
      };
    });
  }

  @TsRestHandler(usersContract.createUser)
  @RequireRoles('admin', 'organization-admin')
  @RequirePermissions('users:create')
  async createUser(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(usersContract.createUser, async ({ body }) => {
      // body автоматически валидируется через Zod схему из контракта
      const createUserData = CreateUserSchema.parse(body);

      return {
        status: 201,
        body: await this.usersService.create(createUserData),
      };
    });
  }
}
```

### Module Configuration with Zod

```typescript
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
        JwtService,
        ACMClientService,
      ],
      exports: ['AUTH_MIDDLEWARE_CONFIG', JwtService, ACMClientService],
    };
  }
}
```

## 🔄 Integration Steps

### 1. Создание библиотеки

```bash
npx nx g @nx/js:lib auth-middleware --tags=npm:public
```

### 2. Установка зависимостей

```json
{
  "dependencies": {
    "@iot-hub/users": "*",
    "@iot-hub/auth": "*",
    "@iot-hub/acm-contracts": "*",
    "@ts-rest/core": "^3.30.0",
    "@ts-rest/nest": "^3.30.0",
    "jose": "^4.14.4",
    "zod": "^3.22.4"
  }
}
```

### 3. Миграция существующего кода

- Заменить интерфейсы на Zod схемы
- Использовать `z.infer<>` вместо ручных типов
- Переписать все валидации через Zod
- Интегрировать ts-rest контракты

## 🚀 Функциональные требования

### 1. JWT Middleware (`JwtAuthMiddleware`)

- Извлечение и валидация JWT токена
- Декодирование payload через существующие схемы
- Создание AuthenticatedUser объекта
- Добавление в request.user
- Dev-режим с mock пользователем

### 2. RBAC Middleware (`RbacMiddleware`)

- Обогащение user объекта правами из ACM
- Кэширование permissions (опционально)
- Добавление permissions в request.user
- Retry логика для ACM запросов

### 3. Guards

- **PermissionsGuard**: Проверка required permissions из метаданных декоратора
- **RolesGuard**: Проверка required roles с OR логикой
- **OrganizationGuard**: Проверка принадлежности к организации

### 4. Декораторы

- `@CurrentUser()` - получение текущего пользователя
- `@RequirePermissions()` - требования к permissions
- `@RequireRoles()` - требования к ролям
- `@OrganizationContext()` - контекст организации

### 5. Сервисы

- **ACMClientService**: HTTP клиент для ACM через ts-rest
- **JwtService**: JWT декодирование/валидация через jose

## 🧪 Тестирование

### Unit тесты

- JWT декодирование и валидация
- ACM клиент (с mock)
- Guards логика
- Декораторы поведение
- Zod схемы валидация

### Integration тесты

- Полный flow аутентификации
- Интеграция с ACM
- Кэширование permissions
- Error handling

### E2E тесты

- Реальные HTTP запросы с JWT
- Проверка RBAC в контроллерах
- Различные сценарии доступа

## 📖 Документация

### README.md

- Быстрый старт
- Примеры использования
- Конфигурация
- Миграция с существующего middleware

### API Documentation

- Zod схемы и типы
- ts-rest контракты
- Декораторы
- Guards
- Сервисы

## 🔄 План миграции

### Этап 1: Создание базовой библиотеки

1. Создать Nx библиотеку `@iot-hub/auth-middleware`
2. Определить Zod схемы
3. Создать ts-rest контракты
4. Реализовать JWT middleware

### Этап 2: RBAC интеграция

1. Реализовать ACM клиент через ts-rest
2. Добавить RBAC middleware
3. Создать guards для permissions/roles

### Этап 3: Расширенная функциональность

1. Кэширование permissions
2. Организационный контекст
3. Advanced guards

### Этап 4: Миграция сервисов

1. Заменить существующий middleware в backend
2. Интегрировать в ACM сервис
3. Подключить к новым сервисам

## ⚡ Производительность

### Требования

- JWT декодирование: < 10ms
- ACM запрос: < 100ms
- Кэш hit: < 1ms
- Memory overhead: < 50MB на сервис

### Оптимизации

- Кэширование permissions с TTL
- Connection pooling для ACM
- Lazy loading для JWKS
- Background refresh для кэша

## 🔒 Безопасность

### Принципы

- Валидация всех JWT полей через Zod
- Проверка token expiration
- Rate limiting для ACM запросов
- Secure defaults для конфигурации
- Audit logging для доступа

---

**Ключевые отличия:**

- ✅ Все через **Zod schemas**
- ✅ Все API через **ts-rest contracts**
- ✅ Никаких ручных интерфейсов
- ✅ Валидация только через `Schema.parse()`
- ✅ Типы только через `z.infer<typeof Schema>`
- ✅ Переиспользование существующих схем из `libs/contracts`

**Ожидаемый результат:** Полнофункциональная библиотека для единой аутентификации и авторизации во всех микросервисах проекта, с интеграцией в ACM сервис и поддержкой всех паттернов RBAC, полностью построенная на Zod и ts-rest.
