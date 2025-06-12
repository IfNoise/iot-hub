# Development Examples для Keycloak OAuth2 Middleware

Этот файл содержит практические примеры использования Development Stub для различных сценариев разработки.

## Быстрый старт

### 1. Запуск с настройками по умолчанию

```bash
# Убедитесь, что Keycloak переменные НЕ установлены
unset KEYCLOAK_URL
unset KEYCLOAK_REALM

# Запустите сервер
npm exec nx run @iot-hub/backend:serve --configuration=development
```

По умолчанию будет создан пользователь-администратор:

- ID: `dev-user-id`
- Email: `dev@example.com`
- Name: `Dev User`
- Role: `admin`

### 2. Тестирование API

```bash
# Запустите готовый скрипт тестирования
./test-dev-stub.sh
```

## Настройка различных пользователей

### Пример 1: Обычный пользователь

```bash
# Установите переменные окружения
export DEV_USER_ID="user-123"
export DEV_USER_EMAIL="john.doe@company.com"
export DEV_USER_NAME="John Doe"
export DEV_USER_ROLE="user"
export DEV_USER_EMAIL_VERIFIED="true"

# Перезапустите сервер
npm exec nx run @iot-hub/backend:serve --configuration=development
```

Тестирование:

```bash
# Информация о пользователе
curl http://localhost:3000/api/auth/me
# Ответ: {"id":"user-123","email":"john.doe@company.com","name":"John Doe","role":"user","isEmailVerified":true}

# Endpoint для администраторов (должен вернуть 403)
curl http://localhost:3000/api/auth/admin
# Ответ: {"statusCode":403,"message":"Forbidden resource","error":"Forbidden"}
```

### Пример 2: Администратор с аватаром

```bash
export DEV_USER_ID="admin-456"
export DEV_USER_EMAIL="admin@company.com"
export DEV_USER_NAME="System Administrator"
export DEV_USER_ROLE="admin"
export DEV_USER_AVATAR="https://example.com/avatar.jpg"
export DEV_USER_EMAIL_VERIFIED="true"

# Перезапустите сервер
npm exec nx run @iot-hub/backend:serve --configuration=development
```

### Пример 3: Пользователь с неподтверждённым email

```bash
export DEV_USER_EMAIL="new.user@company.com"
export DEV_USER_NAME="New User"
export DEV_USER_ROLE="user"
export DEV_USER_EMAIL_VERIFIED="false"

# Перезапустите сервер
npm exec nx run @iot-hub/backend:serve --configuration=development
```

## Сценарии тестирования

### Тестирование авторизации по ролям

#### Шаг 1: Тестирование как администратор

```bash
export DEV_USER_ROLE="admin"
# Перезапуск сервера...

# Проверка доступа к admin-only endpoints
curl http://localhost:3000/api/auth/admin
# Ожидаемый результат: 200 OK
```

#### Шаг 2: Тестирование как обычный пользователь

```bash
export DEV_USER_ROLE="user"
# Перезапуск сервера...

# Проверка доступа к admin-only endpoints
curl http://localhost:3000/api/auth/admin
# Ожидаемый результат: 403 Forbidden
```

### Тестирование с различными пользователями

Создайте файл `.env.test`:

```bash
# .env.test - Для тестирования обычного пользователя
DEV_USER_ID=test-user-001
DEV_USER_EMAIL=test@example.com
DEV_USER_NAME=Test User
DEV_USER_ROLE=user
DEV_USER_EMAIL_VERIFIED=true
```

Загрузите переменные:

```bash
source .env.test
npm exec nx run @iot-hub/backend:serve --configuration=development
```

## Автоматизированное тестирование

### Скрипт для смены ролей

Создайте `switch-user.sh`:

```bash
#!/bin/bash

case $1 in
  "admin")
    export DEV_USER_EMAIL="admin@company.com"
    export DEV_USER_NAME="Administrator"
    export DEV_USER_ROLE="admin"
    ;;
  "user")
    export DEV_USER_EMAIL="user@company.com"
    export DEV_USER_NAME="Regular User"
    export DEV_USER_ROLE="user"
    ;;
  *)
    echo "Usage: $0 [admin|user]"
    exit 1
    ;;
esac

echo "Переключен на пользователя: $DEV_USER_NAME ($DEV_USER_ROLE)"
echo "Перезапустите сервер для применения изменений"
```

Использование:

```bash
chmod +x switch-user.sh
source ./switch-user.sh admin
# или
source ./switch-user.sh user
```

## Интеграция с фронтендом

### Пример использования в контроллере

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { AuthenticatedUser } from '../common/types/keycloak-user.interface';

@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      isDevelopment: process.env.NODE_ENV === 'development',
      isKeycloakEnabled: !!process.env.KEYCLOAK_URL,
    };
  }
}
```

### Проверка в фронтенде

```javascript
// Пример для фронтенда
fetch('/api/profile')
  .then((response) => response.json())
  .then((data) => {
    if (!data.isKeycloakEnabled) {
      console.warn('⚠️ Development mode: using mock authentication');
    }

    console.log('Current user:', data.user);

    // Показать различный UI в зависимости от роли
    if (data.user.role === 'admin') {
      showAdminPanel();
    } else {
      showUserPanel();
    }
  });
```

## Отладка и логирование

### Включение дополнительного логирования

В middleware добавлено debug логирование:

```typescript
// В логах будут отображаться сообщения:
[2025-06-10 13:03:51.360 +0700] WARN: Keycloak не настроен. Middleware отключен.
[2025-06-10 13:03:51.360 +0700] DEBUG: Использована заглушка пользователя: dev@example.com (роль: admin)
```

### Проверка переменных окружения

```bash
# Просмотр всех DEV_USER переменных
env | grep DEV_USER

# Сброс всех переменных
unset DEV_USER_ID DEV_USER_EMAIL DEV_USER_NAME DEV_USER_ROLE DEV_USER_AVATAR DEV_USER_EMAIL_VERIFIED
```

## Известные ограничения и решения

### 1. Изменение настроек требует перезапуска

**Проблема**: Переменные окружения читаются только при запуске сервера.

**Решение**: Используйте hot reload в development режиме или создайте endpoint для переключения пользователей.

### 2. Отсутствие session management

**Проблема**: Development stub не эмулирует реальные сессии.

**Решение**: Для тестирования сессий используйте реальную настройку Keycloak или мокируйте дополнительные параметры.

### 3. Ограничения в тестировании workflow

**Проблема**: Невозможно протестировать логин/логаут flow.

**Решение**: Создайте дополнительные endpoints для эмуляции этих процессов в development режиме.

## Переход в production

### Отключение Development Stub

```bash
# Установите реальные настройки Keycloak
export KEYCLOAK_URL="https://your-keycloak-server.com"
export KEYCLOAK_REALM="your-realm"
export KEYCLOAK_CLIENT_ID="your-client-id"

# Удалите все DEV_USER переменные
unset DEV_USER_ID DEV_USER_EMAIL DEV_USER_NAME DEV_USER_ROLE DEV_USER_AVATAR DEV_USER_EMAIL_VERIFIED

# Перезапустите сервер
npm exec nx run @iot-hub/backend:serve --configuration=production
```

### Проверка production режима

```bash
# В логах должно появиться сообщение:
# "Keycloak middleware enabled for realm: your-realm"

# Endpoint без токена должен вернуть 401
curl http://localhost:3000/api/auth/me
# Ожидаемый результат: {"statusCode":401,"message":"Unauthorized"}
```

## Дополнительные ресурсы

- [Основная документация](./DEVELOPMENT_STUB.md)
- [Конфигурация Keycloak](./KEYCLOAK_OAUTH2_MIDDLEWARE.md)
- [Swagger UI](http://localhost:3000/api/docs) (при запущенном сервере)

## Troubleshooting

### Сервер не отвечает на запросы

1. Проверьте, что сервер запущен: `ps aux | grep "nx run"`
2. Проверьте порт: `netstat -tlnp | grep :3000`
3. Проверьте логи сервера на ошибки

### Middleware не применяется

1. Убедитесь, что KEYCLOAK_URL и KEYCLOAK_REALM не установлены
2. Проверьте конфигурацию исключений в `app.module.ts`
3. Очистите кэш: `rm -rf dist/` и перезапустите

### Неправильная роль пользователя

1. Проверьте значение `DEV_USER_ROLE`: должно быть только 'admin' или 'user'
2. Перезапустите сервер после изменения переменных
3. Очистите кэш браузера/HTTP клиента
