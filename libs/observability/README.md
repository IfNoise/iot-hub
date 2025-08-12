# 1. Библиотека @iot-hub/observability

**Структура:**

```plaintext

libs/observability/
├── src/
│ ├── config/ # Zod схемы конфигурации
│ │ ├── observability.schema.ts
│ │ ├── logging.schema.ts
│ │ └── telemetry.schema.ts
│ ├── services/ # Сервисы observability
│ │ ├── observability-config.service.ts
│ │ ├── otel.service.ts
│ │ ├── metrics.service.ts
│ │ ├── telemetry.service.ts
│ │ └── logging.service.ts
│ ├── types/ # Типы выведенные из Zod схем
│ │ └── index.ts
│ ├── instrumentation/ # OpenTelemetry инициализация
│ │ └── index.ts
│ ├── observability.module.ts # NestJS модуль
│ └── index.ts # Публичный API
```

**Ключевые особенности:**

- ✅ **Contract First**: Все типы выведены из Zod схем
- ✅ **Auto-configuration**: Автоматическое определение сервиса из package.json
- ✅ **Environment mapping**: Полное покрытие переменных окружения
- ✅ **TypeScript**: Полная типизация с выводом из схем
- ✅ **NestJS integration**: Готовый к injection глобальный модуль

## 🚀 Демонстрация работы

### Пример кода в UserController

```typescript
@Post()
async create(@Body() createUserData: CreateUser): Promise<User> {
  const startTime = Date.now();
  const span = this.telemetryService.createSpan('user.create', {
    'user.email': createUserData.email,
    'operation': 'create_user',
  });

  try {
    this.loggingService.log('info', 'Creating new user', {
      operation: 'create_user',
      email: createUserData.email,
    });

    const user = await this.userService.create(createUserData);
    const duration = Date.now() - startTime;

    // Метрики успеха
    this.metricsService.recordBusinessOperation({
      serviceName: 'user-management',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      operation: 'create_user',
      entityType: 'user',
      entityId: user.id,
      success: true,
      durationMs: duration,
    });

    span.setStatus({ code: 1 }); // SUCCESS
    span.end();
    return user;
  } catch (error) {
    // Обработка ошибок с полной observability
    // ...
  }
}
```

## 📊 Покрытие observability

### 1. Телеметрия (Tracing)

- ✅ Автоматическая инициализация OpenTelemetry
- ✅ Создание spans для операций
- ✅ Передача контекста трейсов
- ✅ Обработка ошибок в spans

### 2. Метрики

- ✅ Бизнес-метрики (операции пользователей)
- ✅ Системные метрики
- ✅ Метрики производительности
- ✅ Метрики ошибок

### 3. Логирование

- ✅ Структурированные логи JSON
- ✅ Поддержка файлового логирования
- ✅ Интеграция с Loki (опционально)
- ✅ Метаданные и контекст

### 4. Мониторинг здоровья

- ✅ Health checks для observability компонентов
- ✅ Автоматическая диагностика конфигурации
- ✅ Статистика файлов логов

## 🔧 Конфигурация

### Переменные окружения

```bash
# Service Identity
SERVICE_NAME=user-management
SERVICE_VERSION=1.0.0
NODE_ENV=development

# OpenTelemetry
OTEL_ENABLED=true
OTEL_COLLECTOR_URL=http://localhost:4318
OTEL_ENABLE_TRACING=true
OTEL_ENABLE_METRICS=true
OTEL_ENABLE_LOGGING=true

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/user-management.log
LOG_FORMAT=json

# Loki (optional)
LOKI_ENABLED=false
LOKI_URL=http://localhost:3100
```

## ✅ Результаты тестирования

- ✅ **Сборка библиотеки**: Успешно
- ✅ **TypeScript**: Без ошибок
- ✅ **Dependency injection**: Работает корректно
- ✅ **Contract First**: Все типы из Zod схем

## 🏆 Заключение

Создана полноценная система observability для IoT Hub, которая:

- Следует принципам **Contract First**
- Использует **Zod** для валидации и типизации
- Полностью интегрирована с **NestJS**
- Готова к **production** использованию
- Легко масштабируется на другие микросервисы
