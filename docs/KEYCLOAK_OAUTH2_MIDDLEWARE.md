# Keycloak OAuth2 Proxy Middleware

Этот middleware предназначен для интеграции с Keycloak через OAuth2 proxy. Он валидирует JWT токены, извлекает информацию о пользователе и синхронизирует её с локальной базой данных.

## Возможности

- ✅ Валидация JWT токенов от Keycloak
- ✅ Поддержка OAuth2 proxy заголовков
- ✅ Извлечение информации о пользователе (ID, email, имя, аватар, роли)
- ✅ Автоматическая синхронизация пользователей с БД
- ✅ Проверка ролей пользователей
- ✅ Декораторы для удобного доступа к данным пользователя

## Конфигурация

### 1. Переменные окружения

Скопируйте `.env.example` в `.env` и настройте:

```bash
cp .env.example .env
```

Основные переменные для Keycloak:

```env
# Keycloak Configuration
KEYCLOAK_URL=https://your-keycloak-domain.com
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_CLIENT_ID=your-client-id

# OAuth2 Proxy Headers (можно оставить по умолчанию)
OAUTH2_PROXY_USER_HEADER=X-Auth-Request-User
OAUTH2_PROXY_EMAIL_HEADER=X-Auth-Request-Email
OAUTH2_PROXY_PREFERRED_USERNAME_HEADER=X-Auth-Request-Preferred-Username
OAUTH2_PROXY_ACCESS_TOKEN_HEADER=X-Auth-Request-Access-Token
```

### 2. Настройка OAuth2 Proxy

Пример конфигурации OAuth2 proxy:

```yaml
# oauth2-proxy.cfg
http_address = "0.0.0.0:4180"
upstreams = ["http://localhost:3000/"]

client_id = "your-client-id"
client_secret = "your-client-secret"

oidc_issuer_url = "https://your-keycloak-domain.com/realms/your-realm"
scope = "openid profile email"

set_xauthrequest = true
set_authorization_header = true
pass_access_token = true
pass_user_headers = true

email_domains = ["*"]
```

## Использование

### 1. Защищенные эндпоинты

Middleware автоматически применяется ко всем маршрутам (кроме исключений в `app.module.ts`):

```typescript
@Controller('api/protected')
export class ProtectedController {
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
```

### 2. Получение информации о пользователе

```typescript
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { AuthenticatedUser } from '../common/types/keycloak-user.interface';

@Controller('api/user')
export class UserController {
  // Получить всю информацию о пользователе
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // Получить только email
  @Get('email')
  getEmail(@CurrentUser('email') email: string) {
    return { email };
  }

  // Получить только ID
  @Get('id')
  getId(@CurrentUser('id') id: string) {
    return { id };
  }
}
```

### 3. Проверка ролей

```typescript
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guard/roles-guard.guard';

@Controller('api/admin')
export class AdminController {
  // Только для администраторов
  @Get('dashboard')
  @Roles('admin')
  @UseGuards(RolesGuard)
  getDashboard() {
    return 'Admin dashboard';
  }

  // Для пользователей и администраторов
  @Get('profile')
  @Roles('user', 'admin')
  @UseGuards(RolesGuard)
  getProfile() {
    return 'User profile';
  }
}
```

### 4. Синхронизация с базой данных

Middleware автоматически синхронизирует пользователей с локальной БД:

```typescript
import { KeycloakUserService } from '../common/services/keycloak-user.service';

@Controller('api/user')
export class UserController {
  constructor(private keycloakUserService: KeycloakUserService) {}

  @Get('full-profile')
  async getFullProfile(@CurrentUser() user: AuthenticatedUser) {
    // Получает данные как из Keycloak, так и из локальной БД
    const enrichedUser = await this.keycloakUserService.getEnrichedUserInfo(
      user
    );
    return enrichedUser;
  }
}
```

## Структура данных пользователя

### AuthenticatedUser

```typescript
interface AuthenticatedUser {
  id: string; // Keycloak user ID (sub claim)
  email: string; // Email пользователя
  name: string; // Имя пользователя
  avatar?: string; // URL аватара (из picture claim)
  role: 'admin' | 'user'; // Роль пользователя
  isEmailVerified: boolean; // Статус верификации email
  sessionState?: string; // Состояние сессии Keycloak
}
```

### Поля JWT токена

Middleware извлекает следующие поля из JWT токена Keycloak:

- `sub` → `id` (обязательно)
- `email` → `email` (обязательно)
- `name` / `preferred_username` / `given_name + family_name` → `name`
- `picture` → `avatar`
- `email_verified` → `isEmailVerified`
- `realm_access.roles` / `resource_access[client_id].roles` → `role`

## Тестирование

### 1. Проверка аутентификации

```bash
# Запуск приложения
npm run serve

# Тест эндпоинтов
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/auth/me
curl -H "X-Auth-Request-User: user@example.com" \
     -H "X-Auth-Request-Access-Token: YOUR_JWT_TOKEN" \
     http://localhost:3000/api/auth/profile
```

### 2. Доступные эндпоинты для тестирования

- `GET /api/auth/me` - Базовая информация о пользователе
- `GET /api/auth/profile` - Полный профиль пользователя
- `GET /api/auth/admin` - Только для администраторов
- `GET /api/auth/user` - Для пользователей и администраторов

## Настройка ролей в Keycloak

### 1. Создание ролей

В Keycloak создайте роли:

- `admin` - для администраторов
- `user` - для обычных пользователей

### 2. Назначение ролей

Роли можно назначить:

- На уровне realm (`realm_access.roles`)
- На уровне клиента (`resource_access[client_id].roles`)

Middleware проверяет оба уровня, приоритет у client-specific ролей.

## Исключения из middleware

В `app.module.ts` настроены исключения для:

- Swagger документация (`/api/docs`)
- Health check (`/api/health`)
- Статические файлы (js, css, изображения)

Добавить новые исключения можно в методе `configure()`:

```typescript
consumer
  .apply(KeycloakOAuth2Middleware)
  .exclude(
    'api/docs(.*)',
    'api/health',
    'api/public(.*)' // Новое исключение
  )
  .forRoutes('*');
```

## Логирование

Middleware использует NestJS Logger для отладки:

```typescript
this.logger.debug(`Пользователь аутентифицирован: ${user.email} (${user.id})`);
this.logger.error('Ошибка аутентификации:', error);
```

Уровень логирования настраивается через `LOG_LEVEL` в .env файле.

## Обработка ошибок

Middleware выбрасывает `UnauthorizedException` в случаях:

- Отсутствие токена
- Недействительный JWT токен
- Отсутствие обязательных полей (sub, email)
- Ошибка верификации токена

Ошибки автоматически обрабатываются NestJS Exception Filter.
