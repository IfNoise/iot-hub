# Извлечение UserID через Middleware

## Обзор

В системе IoT Hub все API эндпоинты, связанные с пользователями, извлекают `userId` из JWT токена через middleware аутентификации. Это обеспечивает безопасность и избегает возможности подделки идентификатора пользователя в теле запроса.

## Архитектурное решение

### Принципы

1. **Безопасность**: `userId` никогда не передается в теле запроса пользователем
2. **Аутентификация**: `userId` всегда извлекается из валидного JWT токена
3. **Единообразие**: Все пользовательские эндпоинты следуют одному паттерну

### Реализация

#### Middleware аутентификации

Система использует JWT токены для аутентификации пользователей. После валидации токена, данные пользователя становятся доступны через декоратор `@CurrentUser()`.

```typescript
// src/common/decorator/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  }
);
```

#### Использование в контроллерах

```typescript
@TsRestHandler(devicesContract.user.bindDeviceQR)
async bindDeviceQR(@CurrentUser() user: AuthenticatedUser) {
  return tsRestHandler(
    devicesContract.user.bindDeviceQR,
    async ({ body }) => {
      // userId получаем из middleware аутентификации, а не из body
      const result = await this.devicesService.bindDevice({
        id: body.qrData.deviceId,
        ownerId: user.id, // userId из JWT токена
      });
      // ...
    }
  );
}
```

## Контракты и метаданные

### Метаданные в контрактах

Все пользовательские эндпоинты имеют соответствующие метаданные в контрактах:

```typescript
{
  metadata: {
    requiresAuth: true,
    userIdFromToken: true,
  } as const,
}
```

### Схемы без userId

Схемы запросов не содержат поле `userId`, так как оно извлекается из токена:

```typescript
// ✅ Правильно - без userId в схеме
export const BindDeviceSchema = z
  .object({
    id: z.string().describe('Уникальный ID устройства'),
    // Примечание: ownerId (userId) получается из JWT токена через middleware аутентификации
    // и НЕ передается в теле запроса
  })
  .strict();

// ❌ Неправильно - userId в схеме
export const BadBindDeviceSchema = z
  .object({
    id: z.string(),
    userId: z.string().uuid(), // НЕ ИСПОЛЬЗУЙТЕ!
  })
  .strict();
```

## Затронутые эндпоинты

### Пользовательские эндпоинты

Все следующие эндпоинты используют извлечение `userId` из middleware:

1. **POST /devices/bind-qr** - Привязка устройства через QR-код
2. **POST /devices/unbind** - Отвязка устройства
3. **GET /devices/my** - Получение списка устройств пользователя
4. **GET /devices/:deviceId/status** - Получение статуса устройства

### Административные эндпоинты

Административные эндпоинты могут получать `userId` как через middleware (для проверки прав администратора), так и через параметры запроса (для операций с другими пользователями).

## Миграция

### До изменений

```typescript
// Старый подход - userId в body
{
  "deviceId": "device-123",
  "userId": "user-456" // ❌ Небезопасно
}
```

### После изменений

```typescript
// Новый подход - только необходимые данные в body
{
  "qrData": {
    "deviceId": "device-123",
    "bindingToken": "token-789"
  }
}
// userId извлекается из Authorization: Bearer <jwt-token>
```

## Преимущества

1. **Безопасность**: Исключена возможность подделки userId
2. **Простота**: Клиентам не нужно передавать userId в запросах
3. **Согласованность**: Единый подход для всех пользовательских операций
4. **Аудит**: Все операции автоматически связаны с аутентифицированным пользователем

## Рекомендации для разработчиков

### Frontend/Client разработчикам

1. Не включайте `userId` в тело запросов
2. Убедитесь, что JWT токен передается в заголовке `Authorization`
3. Обрабатывайте ошибки аутентификации (401, 403)

### Backend разработчикам

1. Используйте декоратор `@CurrentUser()` для получения данных пользователя
2. Добавляйте метаданные `requiresAuth: true, userIdFromToken: true` в контракты
3. Валидируйте права пользователя в сервисах
4. Документируйте эндпоинты, которые требуют аутентификации

## Примеры

### Правильное использование

```typescript
// Контроллер
@TsRestHandler(contract.user.someEndpoint)
async someEndpoint(@CurrentUser() user: AuthenticatedUser) {
  // user.id содержит userId из JWT токена
  const result = await this.service.doSomething(user.id, body.data);
  return { status: 200, body: result };
}

// Сервис
async doSomething(userId: string, data: any) {
  // Проверяем права пользователя
  if (!await this.hasPermission(userId)) {
    throw new Error('Access denied');
  }
  // Выполняем операцию
}
```

### Неправильное использование

```typescript
// ❌ НЕ ДЕЛАЙТЕ ТАК
async badEndpoint() {
  return tsRestHandler(contract, async ({ body }) => {
    // Никогда не доверяйте userId из body
    const result = await this.service.doSomething(body.userId, body.data);
    return result;
  });
}
```

## Связанные документы

- [PERPETUAL_TOKENS_MIGRATION.md](./PERPETUAL_TOKENS_MIGRATION.md) - Миграция на бессрочные токены
- [QR_OPTIMIZATION.md](./QR_OPTIMIZATION.md) - Оптимизация QR-кодов
- [DEVICE_ACCESS_CONTROL.md](./DEVICE_ACCESS_CONTROL.md) - Контроль доступа к устройствам
