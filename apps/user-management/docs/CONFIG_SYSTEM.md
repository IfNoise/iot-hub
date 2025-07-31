# Configuration System для User Management Service

Этот документ описывает новую систему конфигурации для микросервиса User Management, созданную по аналогии с основным backend, но адаптированную для использования с Drizzle ORM.

## Архитектура

Система конфигурации организована в виде модульной структуры с разделением по доменам:

```
src/config/
├── config.service.ts          # Главный сервис конфигурации
├── config.module.ts           # NestJS модуль
├── config.schema.ts           # Главная схема и типы
├── index.ts                   # Экспорты
├── common/                    # Общие настройки
├── auth/                      # Аутентификация
├── database/                  # База данных (Drizzle)
├── telemetry/                 # OpenTelemetry
└── kafka/                     # Kafka конфигурация
```

## Основные особенности

### 1. Валидация с Zod

Все переменные окружения валидируются с помощью Zod схем:

```typescript
const envConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  // ...
});
```

### 2. Доменное разделение

Каждый домен имеет свою схему и сервис:

- **CommonConfigService** - общие настройки (порт, CORS, Redis, логи)
- **AuthConfigService** - JWT, Keycloak
- **DatabaseConfigService** - Drizzle ORM конфигурация
- **TelemetryConfigService** - OpenTelemetry метрики
- **KafkaConfigService** - Kafka настройки

### 3. Адаптация для Drizzle

Вместо TypeORM конфигурации используется специальная конфигурация для Drizzle:

```typescript
// Drizzle connection options
interface DrizzleConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
}
```

### 4. Environment-specific настройки

```typescript
// Development
getDevelopmentConfig(): {
  connection: DrizzleConnectionOptions;
  logging: true;
  debug: true;
}

// Production
getProductionConfig(): {
  connection: DrizzleConnectionOptions;
  logging: false;
  debug: false;
}
```

## Использование

### Основной сервис

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly configService: ConfigService) {}

  someMethod() {
    // Прямой доступ к доменным сервисам
    const dbConfig = this.configService.database.getAll();
    const kafkaOptions = this.configService.kafka.getKafkaOptions();

    // Удобные методы
    const isProduction = this.configService.isProduction();
    const redisConfig = this.configService.getRedisConfig();
  }
}
```

### Доменные сервисы

```typescript
// Прямой доступ к доменным конфигурациям
const commonConfig = this.configService.common.getAll();
const authConfig = this.configService.auth.getJwtConfig();
const dbUrl = this.configService.database.getDatabaseUrl();
const telemetryConfig = this.configService.telemetry.getOpenTelemetryConfig();
```

## Переменные окружения

### Database (Drizzle)

```env
DB_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=iot_user
DATABASE_PASSWORD=iot_password
DATABASE_NAME=user_management
DATABASE_SSL=false
DATABASE_POOL_SIZE=10
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
```

### Common

```env
NODE_ENV=development
PORT=3001
SERVICE_NAME=user-management
SERVICE_VERSION=1.0.0
CORS_ORIGIN=*
CORS_CREDENTIALS=true
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

### Auth

```env
JWT_SECRET=your-super-secret-development-key-32-chars-long
JWT_EXPIRATION=1h
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=iot-hub
KEYCLOAK_CLIENT_ID=user-management
```

### Telemetry

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=user-management
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_ENABLE_TRACING=true
OTEL_ENABLE_METRICS=true
OTEL_ENABLE_LOGS=true
```

### Kafka

```env
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=user-management
KAFKA_GROUP_ID=user-management-group
```

## Интеграция с существующими модулями

### DatabaseService

```typescript
@Injectable()
export class DatabaseService {
  constructor(private readonly configService: ConfigService) {
    const databaseConfig = this.configService.getDatabaseConfig();
    this.client = postgres(this.configService.getDatabaseUrl(), {
      max: databaseConfig.connection.max,
      idle_timeout: databaseConfig.connection.idleTimeoutMillis,
      debug: databaseConfig.debug,
    });
  }
}
```

### KafkaModule

```typescript
{
  provide: KafkaProducer,
  useFactory: (configService: ConfigService) => {
    const kafkaConfig = configService.kafka.getKafkaOptions();
    return new KafkaProducer(kafkaConfig);
  },
  inject: [ConfigService],
}
```

## Преимущества

1. **Типизированная конфигурация** - все значения валидируются и типизированы
2. **Модульность** - легко добавить новые домены конфигурации
3. **Environment-aware** - разные настройки для dev/prod/test
4. **Drizzle интеграция** - специально адаптирована для Drizzle ORM
5. **Консистентность** - единый подход во всех микросервисах
6. **Отладка** - удобные методы для debugging в development mode

## Миграция

При миграции с старой системы:

1. Замените `@nestjs/config` на наш `ConfigModule`
2. Обновите переменные окружения (см. список выше)
3. Используйте типизированные методы вместо `configService.get()`
4. Обновите модули для использования новых конфигураций
