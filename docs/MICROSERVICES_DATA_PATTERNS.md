# Паттерны работы с данными в микросервисной архитектуре

## 1. Database per Service Pattern

### UserManagement Service

- **БД**: PostgreSQL (пользователи, роли, профили)
- **Схема**: users, user_profiles, roles
- **Доступ**: Только UserManagement сервис

### DeviceManagement Service

- **БД**: PostgreSQL + TimescaleDB (устройства + метрики)
- **Схема**: devices, device_types, device_metrics
- **Доступ**: Только DeviceManagement сервис

### NotificationService

- **БД**: Redis (кеш уведомлений) + MongoDB (история)
- **Схема**: notifications, templates, delivery_logs
- **Доступ**: Только NotificationService

## 2. Event-Driven Data Synchronization

### Saga Pattern

```
UserCreated → DeviceService (создает профиль устройства)
            → NotificationService (отправляет welcome email)
            → AuditService (логирует действие)
```

### Event Sourcing

```
UserAggregate:
- UserCreatedEvent
- UserUpdatedEvent
- UserDeactivatedEvent
- UserRoleChangedEvent
```

## 3. CQRS (Command Query Responsibility Segregation)

### Command Side (Write)

- Обрабатывает команды изменения данных
- Публикует события в Kafka
- Оптимизирована для записи

### Query Side (Read)

- Материализованные представления для чтения
- Обновляется через события Kafka
- Оптимизирована для чтения

## 4. Data Consistency Patterns

### Eventual Consistency

- Данные между сервисами синхронизируются асинхронно
- Кратковременная несогласованность допустима
- Компенсирующие транзакции при ошибках

### Transactional Outbox

- Сохранение данных + события в одной транзакции
- Гарантированная доставка событий
- Идемпотентность обработки
