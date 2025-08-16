# @iot-hub/auth-middleware

Переиспользуемая библиотека для обеспечения единой системы аутентификации и авторизации (RBAC) во всех микросервисах проекта IoT Hub.

## 🎯 Особенности

- ✅ **Contract First**: Все API через ts-rest контракты
- ✅ **Zod Only**: Валидация ИСКЛЮЧИТЕЛЬНО через Zod схемы
- ✅ **Type Safety**: `z.infer<typeof Schema>` вместо ручных интерфейсов
- ✅ **Schema Reuse**: Переиспользование существующих схем из `libs/contracts`
- ✅ **RBAC Integration**: Интеграция с ACM сервисом для получения разрешений
- ✅ **JWT Validation**: Автоматическая валидация и декодирование JWT токенов
- ✅ **Development Mode**: Mock пользователя для разработки

## 📦 Установка

```bash
npm install @iot-hub/auth-middleware
```

## 🚀 Быстрый старт

### 1. Настройка модуля

```typescript
import { AuthMiddlewareModule } from '@iot-hub/auth-middleware';

@Module({
  imports: [
    AuthMiddlewareModule.forRoot({
      jwt: {
        issuer: 'https://keycloak.example.com/realms/iot-hub',
        jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
        audience: 'iot-hub-backend',
      },
      acm: {
        baseUrl: 'http://localhost:3001',
        timeout: 5000,
        retryAttempts: 3,
      },
      cache: {
        enabled: true,
        ttl: 300, // 5 минут
      },
      development: {
        enabled: process.env.NODE_ENV === 'development',
        mockUser: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'dev@example.com',
          name: 'Development User',
          roles: ['admin'],
          permissions: ['users:read', 'users:write', 'devices:manage'],
          tokenExp: Date.now() / 1000 + 3600,
        },
      },
    }),
  ],
})
export class AppModule {}
```

## 📋 API Документация

Подробная документация доступна в техническом задании и inline комментариях к коду.

## 🔧 Сборка

Выполните `nx build auth-middleware` для сборки библиотеки.

## 🧪 Тестирование

Выполните `nx test auth-middleware` для запуска unit тестов.

## 📄 Лицензия

MIT
