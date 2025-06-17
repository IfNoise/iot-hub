# Development Stub для Keycloak OAuth2 Middleware

## Обзор

Development stub позволяет разрабатывать и тестировать приложение без полной настройки Keycloak. Когда переменные окружения `KEYCLOAK_URL` и `KEYCLOAK_REALM` не заданы, middleware автоматически создает mock пользователя для локальной разработки.

## Mock пользователь

По умолчанию создается следующий тестовый пользователь:

```typescript
{
  id: 'dev-user-id',
  email: 'dev@example.com',
  name: 'Dev User',
  avatar: undefined,
  role: 'admin',
  isEmailVerified: true,
  sessionState: 'dev-session',
}
```

## Тестирование API

### Публичные endpoints (не требуют аутентификации)

```bash
# Базовый API endpoint
curl http://localhost:3000/api
# Возвращает: {"message":"Hello API"}

# Health check endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/status
```

### Защищённые endpoints (требуют аутентификации)

```bash
# Информация о текущем пользователе
curl http://localhost:3000/api/auth/me
# Возвращает: {"id":"dev-user-id","email":"dev@example.com","name":"Dev User","role":"admin","isEmailVerified":true}

# Endpoint только для администраторов
curl http://localhost:3000/api/auth/admin
# Возвращает: {"message":"Добро пожаловать, администратор!","admin":"dev@example.com"}

# Endpoint для пользователей и администраторов
curl http://localhost:3000/api/auth/user
# Возвращает: {"message":"Привет, пользователь!","user":{"name":"Dev User","role":"admin"}}

# Список всех пользователей
curl http://localhost:3000/api/users
# Возвращает: []

# Список всех устройств
curl http://localhost:3000/api/devices
# Возвращает: массив устройств из базы данных
```

## Конфигурация исключений

Middleware настроен с исключениями для следующих маршрутов:

- `/api` - базовый endpoint
- `/api/health` - health check
- `/api/status` - статус сервиса

Все остальные маршруты проходят через middleware аутентификации.

## Переключение между development и production

### Development режим (текущий)

- Не устанавливайте `KEYCLOAK_URL` и `KEYCLOAK_REALM`
- Middleware автоматически создаст mock пользователя
- В логах появится сообщение: "Keycloak не настроен. Middleware отключен."

### Production режим

Установите следующие переменные окружения:

```bash
KEYCLOAK_URL=https://your-keycloak-server.com
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id  # опционально
```

## Переменные окружения для OAuth2 Proxy

Если используется OAuth2 Proxy, настройте заголовки:

```bash
OAUTH2_PROXY_USER_HEADER=X-Auth-Request-User
OAUTH2_PROXY_EMAIL_HEADER=X-Auth-Request-Email
OAUTH2_PROXY_PREFERRED_USERNAME_HEADER=X-Auth-Request-Preferred-Username
OAUTH2_PROXY_ACCESS_TOKEN_HEADER=X-Auth-Request-Access-Token
```

## Логирование

Development stub выводит отладочные сообщения:

- При инициализации: уведомление о том, что Keycloak не настроен
- При каждом запросе: информация об использовании mock пользователя

## Использование в контроллерах

```typescript
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { AuthenticatedUser } from '../common/types/keycloak-user.interface';

@Controller('example')
export class ExampleController {
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Get('email')
  getEmail(@CurrentUser('email') email: string) {
    return { email };
  }
}
```

## Роли и права доступа

```typescript
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guard/roles-guard.guard';

@Controller('admin')
export class AdminController {
  @Get('data')
  @Roles('admin')
  @UseGuards(RolesGuard)
  getAdminData(@CurrentUser() user: AuthenticatedUser) {
    return { message: 'Admin only data', user };
  }
}
```

## Swagger документация

API документация доступна по адресу: <http://localhost:3000/api/docs>

## Отладка

Для просмотра логов middleware:

1. Убедитесь, что логирование включено в development режиме
2. Следите за сообщениями в консоли сервера
3. Логи будут показывать использование development stub

## Известные ограничения

1. ~~Development stub всегда создает пользователя с ролью 'admin'~~ ✅ **Исправлено**
2. ~~Нет возможности тестировать различные роли без изменения кода~~ ✅ **Исправлено**
3. SessionState всегда фиксированный ('dev-session')

## Новые возможности настройки

Development stub теперь поддерживает настройку через переменные окружения:

```bash
# Настройка пользователя
export DEV_USER_ID="custom-user-id"
export DEV_USER_EMAIL="custom@example.com"
export DEV_USER_NAME="Custom User"
export DEV_USER_ROLE="user"  # 'admin' или 'user'
export DEV_USER_AVATAR="https://example.com/avatar.jpg"  # опционально
export DEV_USER_EMAIL_VERIFIED="false"  # true или false
```

После установки переменных перезапустите сервер:

```bash
npm exec nx run @iot-hub/backend:serve --configuration=development
```

## TODO для улучшения

1. ~~Добавить возможность настройки mock пользователя через переменные окружения~~ ✅ **Выполнено**
2. ~~Поддержка множественных тестовых пользователей~~ ✅ **Частично выполнено** (через переменные окружения)
3. ~~Эмуляция различных ролей пользователей~~ ✅ **Выполнено**
4. Интеграция с системой тестирования
5. Hot-reload настроек пользователя без перезапуска сервера
6. Эмуляция нескольких пользователей одновременно
7. Эмуляция логин/логаут процесса

## Дополнительные ресурсы

- [Практические примеры](./DEVELOPMENT_EXAMPLES.md) - подробные примеры использования
- [Тестовый скрипт](../test-dev-stub.sh) - автоматизированное тестирование API
