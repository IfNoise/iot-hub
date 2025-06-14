# Device Access Control System

## Обзор

Система контроля доступа к устройствам реализует разграничение доступа на основе ролей пользователей. Она обеспечивает безопасность данных и правильную изоляцию устройств между пользователями.

## Роли пользователей

### Administrator (`admin`)

- **Полный доступ**: может видеть все устройства в системе
- **Управление**: может привязывать/отвязывать любые устройства
- **Мониторинг**: имеет доступ к административным эндпоинтам

### Regular User (`user`)

- **Ограниченный доступ**: видит только свои привязанные устройства
- **Управление**: может управлять только своими устройствами
- **Изоляция**: не имеет доступа к устройствам других пользователей

## API Эндпоинты

### GET `/devices` - Основной эндпоинт для получения устройств

**Поведение зависит от роли пользователя:**

#### Для администраторов (`role: admin`):

```http
GET /devices?page=1&limit=10
Authorization: Bearer <admin-token>
```

**Ответ:**

```json
{
  "devices": [
    {
      "id": "device-001",
      "model": "Sensor-X1",
      "ownerId": "user-123",
      "status": "bound",
      "lastSeenAt": "2025-06-14T10:00:00Z",
      "certificate": { ... }
    },
    {
      "id": "device-002",
      "model": "Sensor-Y2",
      "ownerId": "user-456",
      "status": "bound",
      "lastSeenAt": "2025-06-14T09:30:00Z",
      "certificate": { ... }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Для обычных пользователей (`role: user`):

```http
GET /devices?page=1&limit=10
Authorization: Bearer <user-token>
```

**Ответ:**

```json
{
  "devices": [
    {
      "id": "device-001",
      "model": "Sensor-X1",
      "ownerId": "user-123",
      "status": "bound",
      "lastSeenAt": "2025-06-14T10:00:00Z",
      "certificate": { ... }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET `/devices/admin/all` - Администраторский эндпоинт

**Доступ:** Только для пользователей с ролью `admin`

```http
GET /devices/admin/all?page=1&limit=10
Authorization: Bearer <admin-token>
```

**Особенности:**

- Защищен декораторами `@Roles('admin')` и `@UseGuards(RolesGuard)`
- Всегда возвращает полный список устройств
- Возвращает 403 ошибку для пользователей без роли admin

## Безопасность

### Аутентификация

- Все эндпоинты требуют аутентификации через Keycloak JWT токен
- Токен содержит информацию о пользователе и его ролях

### Авторизация

- Роли извлекаются из JWT токена автоматически
- Система автоматически определяет права доступа на основе роли
- Middleware проверяет права доступа перед выполнением запроса

### Изоляция данных

- Обычные пользователи видят только устройства с `ownerId = user.id`
- Администраторы имеют доступ ко всем устройствам
- Фильтрация происходит на уровне базы данных

## Реализация

### Контроллер

```typescript
@Get()
async getDevices(
  @Query() query: { page?: number; limit?: number },
  @CurrentUser() user: AuthenticatedUser
) {
  // Проверка роли пользователя
  if (user.role === 'admin') {
    return this.devicesService.getDevices(query);
  }

  // Возврат только устройств пользователя
  return this.devicesService.getUserDevices(user.id, query);
}
```

### Сервис

```typescript
// Для администраторов - все устройства
async getDevices({ page = 1, limit = 10 } = {}) {
  const [devices, total] = await this.deviceRepo.findAndCount({
    relations: ['certificate'],
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
  // ...
}

// Для пользователей - только их устройства
async getUserDevices(ownerId: string, { page = 1, limit = 10 } = {}) {
  const [devices, total] = await this.deviceRepo.findAndCount({
    where: { ownerId }, // Фильтрация по владельцу
    relations: ['certificate'],
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
  // ...
}
```

## Тестирование

### Unit тесты

Файл: `devices.controller-rbac.spec.ts`

- Тестирование поведения для администраторов
- Тестирование поведения для обычных пользователей
- Проверка корректности вызовов методов сервиса

### Интеграционные тесты

- Тестирование с реальными JWT токенами
- Проверка работы middleware аутентификации
- Тестирование Guard'ов для защищенных эндпоинтов

## Конфигурация

### Переменные окружения

```env
# Keycloak конфигурация
KEYCLOAK_REALM=iot-hub
KEYCLOAK_CLIENT_ID=backend-api
KEYCLOAK_SECRET=<client-secret>
```

### Роли в Keycloak

1. **admin** - административная роль
2. **user** - роль обычного пользователя

## Мониторинг и логирование

- Все запросы к API логируются с информацией о пользователе
- Отслеживаются попытки несанкционированного доступа
- Метрики по использованию API администраторами и пользователями

## Будущие улучшения

1. **Организации**: Группировка пользователей по организациям
2. **Детальные права**: Более гранулярные разрешения (read/write/delete)
3. **Временные доступы**: Права доступа с ограничением по времени
4. **Audit log**: Детальное логирование всех операций с устройствами
