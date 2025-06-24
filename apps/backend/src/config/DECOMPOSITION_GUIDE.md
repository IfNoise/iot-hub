# Декомпозиция конфигурационного модуля

## Обзор

Была выполнена декомпозиция монолитного конфигурационного модуля по доменным областям для улучшения архитектуры и поддерживаемости кода.

## Структура после декомпозиции

### Доменные конфигурации

```text
apps/backend/src/
├── auth/config/
│   ├── auth-config.schema.ts      # JWT, Keycloak, OAuth2, Dev User
│   └── auth-config.service.ts
├── common/config/
│   ├── common-config.schema.ts    # App, CORS, Security, Redis, Logging
│   ├── common-config.service.ts
│   ├── telemetry-config.schema.ts # OpenTelemetry
│   └── telemetry-config.service.ts
├── database/config/
│   ├── database-config.schema.ts  # Database connection & settings
│   └── database-config.service.ts
├── devices/config/
│   ├── devices-config.schema.ts   # Device management settings
│   └── devices-config.service.ts
├── mqtt/config/
│   ├── mqtt-config.schema.ts      # MQTT broker settings
│   └── mqtt-config.service.ts
├── users/config/
│   ├── users-config.schema.ts     # User management settings
│   └── users-config.service.ts
└── config/
    ├── config.schema.v2.ts        # Centralized env schema
    ├── config.service.v2.ts       # Composed config service
    └── config.module.v2.ts        # New config module
```

## Доменные области

### 1. Auth Domain (`auth/config/`)
- JWT конфигурация
- Keycloak настройки
- OAuth2 Proxy заголовки
- Development User настройки

### 2. Common Domain (`common/config/`)
- Приложение (NODE_ENV, PORT)
- CORS настройки
- Security (Rate limiting)
- Redis конфигурация
- Логирование
- OpenTelemetry (в отдельной схеме)

### 3. Database Domain (`database/config/`)
- Подключение к БД
- TypeORM настройки
- Пулы соединений
- Environment-specific конфигурации

### 4. MQTT Domain (`mqtt/config/`)
- MQTT broker настройки
- Протокол и QoS
- TLS/mTLS конфигурация
- Will сообщения

### 5. Devices Domain (`devices/config/`)
- Таймауты устройств
- Управление сертификатами
- Лимиты устройств
- Retention политики

### 6. Users Domain (`users/config/`)
- Сессии пользователей
- Регистрация
- Профили пользователей
- Политики паролей

## Ключевые преимущества

### 1. Разделение ответственности
- Каждый домен управляет своей конфигурацией
- Четкие границы между доменами
- Легче понимать и поддерживать

### 2. Типобезопасность
- Zod схемы для валидации
- TypeScript типы для всех конфигураций
- Compile-time проверки

### 3. Композиция
- Центральный ConfigService композирует доменные сервисы
- Обратная совместимость с существующим API
- Доступ как к общей, так и к доменной конфигурации

### 4. Тестируемость
- Каждый доменный сервис можно тестировать отдельно
- Мокирование конфигураций по доменам
- Изолированное тестирование

## Использование

### Базовое использование
```typescript
@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Доступ через доменные сервисы
    const jwtConfig = this.configService.auth.getJwtConfig();
    const dbConfig = this.configService.database.getTypeOrmConfig();
    const mqttOptions = this.configService.mqtt.getClientOptions();
    
    // Или напрямую
    const commonConfig = this.configService.common.getAll();
  }
}
```

### Инъекция доменных сервисов
```typescript
@Injectable()
export class AuthService {
  constructor(
    private authConfig: AuthConfigService,
    private commonConfig: CommonConfigService
  ) {}

  authenticate() {
    const jwtSecret = this.authConfig.get('jwtSecret');
    const isDev = this.commonConfig.isDevelopment();
  }
}
```

## Миграция

### Шаг 1: Обновите импорты
```typescript
// Старый способ
import { ConfigService } from './config/config.service';

// Новый способ (обратно совместимый)
import { ConfigService } from './config/config.service.v2';
```

### Шаг 2: Обновите модуль
```typescript
// Замените в app.module.ts
import { ConfigModule } from './config/config.module.v2';
```

### Шаг 3: Используйте доменные конфигурации
```typescript
// Вместо
const jwtSecret = this.configService.get('JWT_SECRET');

// Используйте
const jwtSecret = this.configService.auth.get('jwtSecret');
// или
const jwtConfig = this.configService.auth.getJwtConfig();
```

## Environment Variables

Все существующие переменные окружения остались без изменений. Новые доменные конфигурации используют те же переменные, но с лучшей организацией и валидацией.

### Новые опциональные переменные для доменов:

#### Devices
- `DEVICE_TIMEOUT_MS` (default: 30000)
- `DEVICE_HEARTBEAT_INTERVAL_MS` (default: 10000)
- `MAX_DEVICES_PER_USER` (default: 100)
- `CERTIFICATE_VALIDITY_DAYS` (default: 365)
- `DEVICE_DATA_RETENTION_DAYS` (default: 30)

#### Users
- `USER_SESSION_TIMEOUT_MS` (default: 3600000)
- `MAX_ACTIVE_SESSIONS_PER_USER` (default: 5)
- `ENABLE_USER_REGISTRATION` (default: true)
- `REQUIRE_EMAIL_VERIFICATION` (default: true)
- `USER_PROFILE_IMAGE_MAX_SIZE_BYTES` (default: 2097152)
- `PASSWORD_MIN_LENGTH` (default: 8)
- `PASSWORD_REQUIRE_SPECIAL_CHARS` (default: true)

## Обратная совместимость

Новая архитектура полностью обратно совместима:
- Все существующие методы ConfigService сохранены
- Environment переменные остались теми же
- API остался неизменным

## Следующие шаги

1. **Тестирование**: Добавить unit тесты для каждого доменного сервиса
2. **Миграция в contracts**: Рассмотреть перенос схем в соответствующие библиотеки contracts
3. **Feature flags**: Добавить поддержку feature flags в доменные конфигурации
4. **Валидация**: Добавить кросс-доменную валидацию (например, auth зависит от database)
5. **Документация**: Обновить API документацию с примерами использования доменных конфигураций

## Рекомендации

1. **Используйте доменные сервисы** вместо прямого доступа к env переменным
2. **Группируйте связанные настройки** в convenience методы
3. **Валидируйте конфигурации** на старте приложения
4. **Документируйте новые env переменные** при добавлении функций

## Структура файлов для review

### Созданные файлы:
- `auth/config/auth-config.schema.ts`
- `auth/config/auth-config.service.ts`
- `common/config/common-config.schema.ts`
- `common/config/common-config.service.ts`
- `common/config/telemetry-config.schema.ts`
- `common/config/telemetry-config.service.ts`
- `devices/config/devices-config.schema.ts`
- `devices/config/devices-config.service.ts`
- `users/config/users-config.schema.ts`
- `users/config/users-config.service.ts`
- `database/config/database-config.service.ts`
- `mqtt/config/mqtt-config.service.ts`
- `config/config.schema.v2.ts`
- `config/config.service.v2.ts`
- `config/config.module.v2.ts`

### Обновленные файлы:
- `mqtt/config/mqtt-config.schema.ts` (упрощена и улучшена)

### Оригинальные файлы (остались без изменений):
- `config/config.schema.ts`
- `config/config.service.ts`
- `config/config.module.ts`
- `database/config/database-config.schema.ts`
