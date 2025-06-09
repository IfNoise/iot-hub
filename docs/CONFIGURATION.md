# Environment Configuration

Этот проект использует систему конфигураций, основанную на переменных окружения с валидацией через Zod.

## Структура конфигураций

```
src/config/
├── config.schema.ts          # Схема базовых переменных окружения
├── config.service.ts         # Сервис для работы с конфигурацией
├── config.module.ts          # Модуль конфигурации
├── environment.schema.ts     # Zod схемы для environment-специфичных настроек
├── environment.factory.ts    # Фабрика конфигураций
└── environments/
    ├── development.config.ts # Конфигурация для разработки
    ├── production.config.ts  # Конфигурация для продакшна
    └── test.config.ts        # Конфигурация для тестов
```

## Настройка переменных окружения

### 1. Создайте файлы .env

Скопируйте примеры файлов и настройте их под ваши нужды:

```bash
# Для разработки
cp .env.development.example .env.development

# Для продакшна
cp .env.production.example .env.production

# Для тестов
cp .env.test.example .env.test
```

### 2. Настройте NODE_ENV

Убедитесь, что переменная `NODE_ENV` установлена правильно:

- `development` - для локальной разработки
- `production` - для продакшн среды
- `test` - для запуска тестов

### 3. Базовые переменные (обязательные)

```env
NODE_ENV=development
PORT=3000
DB_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database
JWT_SECRET=your_jwt_secret_key_32_chars_minimum
```

## Environment-специфичные настройки

Каждая среда имеет свои особенности:

### Development

- `synchronize: true` - автосинхронизация схемы БД
- `logging: true` - подробное логирование SQL
- Менее строгие настройки CORS
- Короткий срок действия JWT

### Production

- `synchronize: false` - миграции только через CLI
- `logging: ['error', 'warn']` - минимальное логирование
- Строгие настройки безопасности
- SSL обязателен
- Оптимизированный пул соединений
- Rate limiting

### Test

- `synchronize: true` - автосинхронизация для тестов
- `dropSchema: true` - очистка БД перед тестами
- `logging: false` - без логирования
- In-memory SQLite (по умолчанию)

## Валидация конфигурации

Все конфигурации проходят валидацию через Zod схемы:

1. **Базовые переменные** валидируются через `envConfigSchema`
2. **Environment-специфичные настройки** валидируются через:
   - `environmentConfigSchema` - для настроек приложения
   - `databaseConfigSchema` - для настроек базы данных

## Использование в коде

```typescript
// Получение базовых переменных
const port = configService.get('PORT');
const dbHost = configService.get('DATABASE_HOST');

// Получение environment-специфичных настроек
const appConfig = configService.getAppConfig();
const dbConfig = configService.getDatabaseEnvironmentConfig();

// Использование в других сервисах
const corsOptions = appConfig.cors;
const jwtOptions = appConfig.jwt;
```

## Добавление новых переменных

### 1. Базовые переменные

Добавьте в `config.schema.ts`:

```typescript
export const envConfigSchema = z.object({
  // ...existing...
  NEW_VARIABLE: z.string().min(1),
});
```

### 2. Environment-специфичные настройки

Добавьте в `environment.schema.ts`:

```typescript
export const environmentConfigSchema = z.object({
  // ...existing...
  newFeature: z.object({
    enabled: z.boolean(),
    options: z.record(z.string()),
  }),
});
```

Затем обновите конфигурации в `environments/` директории.

## Безопасность

- Никогда не коммитьте реальные `.env` файлы
- Используйте сильные пароли и секретные ключи
- Для продакшна используйте системы управления секретами
- Регулярно ротируйте JWT секреты
- Настройте SSL для продакшн базы данных
