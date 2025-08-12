# 📋 Руководство по оптимизации схемы базы данных для ACM

## 🎯 Цель оптимизации

Этот документ описывает процесс оптимизации схемы базы данных для ACM (Access Control Management) сервиса, при которой из общей схемы `@iot-hub/shared` используются только необходимые таблицы.

## 📊 Результаты оптимизации

| Параметр | До оптимизации | После оптимизации | Улучшение |
|----------|----------------|-------------------|-----------|
| Количество таблиц | 5 | 3 | ⬇️ 40% |
| Строк в миграции | 130+ | 74 | ⬇️ 43% |
| Индексы | 18 | 11 | ⬇️ 39% |
| Размер базы данных | Полная схема | Только ACM | ⚡ Оптимизировано |

## 🗂️ Таблицы в ACM сервисе

### ✅ Используемые таблицы (3)

- **users** - пользователи системы (16 полей + 5 индексов)
- **organizations** - организации (19 полей + 3 индекса)
- **groups** - группы в организациях (14 полей + 3 индекса)

### 🚫 Исключённые таблицы (2)

- **devices** - управляется в device management сервисах
- **certificates** - управляется в certificate management сервисах

## 🛠️ Техническая реализация

### 1. Создана локальная схема

```typescript
// apps/acm/src/infrastructure/database/acm-schema.ts
// Содержит только необходимые таблицы из shared
export const usersTable = pgTable('users', { /* ... */ });
export const organizationsTable = pgTable('organizations', { /* ... */ });
export const groupsTable = pgTable('groups', { /* ... */ });
```

### 2. Настроена конфигурация Drizzle

```typescript
// apps/acm/drizzle.config.ts
export default defineConfig({
  schema: './src/infrastructure/database/acm-schema.ts', // ACM-специфичная схема
  out: './drizzle/migrations',
  schemaFilter: ['public'],
  // ...
});
```

### 3. Добавлены npm скрипты

```json
{
  "scripts": {
    "db:generate": "node scripts/generate-migrations.cjs",
    "db:migrate": "node scripts/migrate.cjs"
  }
}
```

## 🚀 Команды для работы с оптимизированной схемой

```bash
# 1. Генерация миграций только для ACM таблиц
cd apps/acm
npm run db:generate

# 2. Применение миграций
npm run db:migrate

# 3. Прямое применение схемы (для разработки)
npx drizzle-kit push --config=drizzle.config.ts

# 4. Проверка созданных таблиц
docker exec iot-postgres psql -U iot_user -d iot_hub -c "\dt"
```

## 📈 Преимущества оптимизации

### 🚀 Производительность

- Быстрое развертывание (меньше таблиц)
- Оптимизированные индексы только для ACM операций
- Минимальная схема базы данных

### 🔒 Изоляция

- Изоляция от изменений в других сервисах
- Независимые миграции
- Упрощённая схема для понимания

### 📦 Поддержка

- Легче поддерживать ACM-специфичную схему
- Чёткое разделение ответственности
- Упрощённые тесты и отладка

## 🔄 Миграция на оптимизированную схему

Если у вас уже запущен ACM с полной схемой:

```bash
# 1. Остановите ACM сервис
docker-compose stop acm

# 2. Сделайте бэкап данных (если нужно)
docker exec iot-postgres pg_dump -U iot_user iot_hub > backup.sql

# 3. Очистите базу (или создайте новую)
docker exec iot-postgres psql -U iot_user -d iot_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 4. Примените оптимизированную схему
cd apps/acm
npx drizzle-kit push --config=drizzle.config.ts

# 5. Запустите ACM сервис
docker-compose up acm
```

## 🎯 Заключение

Оптимизация схемы базы данных для ACM сервиса позволила:

- ⚡ Сократить размер схемы на 40%
- 🚀 Ускорить развертывание
- 🔒 Обеспечить изоляцию от других сервисов
- 📦 Упростить поддержку и разработку

ACM сервис теперь использует только необходимые таблицы, сохраняя при этом совместимость с общей архитектурой `@iot-hub/shared`.
