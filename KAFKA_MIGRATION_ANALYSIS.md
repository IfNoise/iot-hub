# Анализ и рефакторинг контрактов для Kafka Event-Driven архитектуры

## 📊 Анализ текущего состояния

### Проанализированные модули:

- ✅ `libs/contracts` - основные контракты
- ✅ `libs/contracts/devices` - устройства
- ✅ `libs/contracts/auth` - аутентификация
- ✅ `libs/contracts/users` - пользователи
- ✅ `libs/contracts/mqtt` - MQTT схемы
- ✅ `libs/contracts/crypto` - сертификаты
- ✅ `libs/kafka` - существующие Kafka схемы (базовые)

### Выявленные проблемы:

#### 1. **REST-ориентированная архитектура**

- Контракты используют `ts-rest` с HTTP-специфичными полями (`method`, `path`, `responses`)
- Нет support для event-driven коммуникации
- Тесная привязка к синхронному request-response паттерну

#### 2. **Отсутствие единой схемы событий**

- Различные форматы событий в разных модулях
- Нет `correlationId` для связи команд и ответов
- Отсутствует `source` информация для трейсинга
- Непоследовательное использование `timestamp`

#### 3. **Смешанная ответственность**

- Валидация и бизнес-логика в одних схемах
- Timeout'ы и другие технические параметры в контрактах
- Отсутствует четкое разделение Commands/Events/Responses

#### 4. **Версионирование**

- Нет системы версионирования схем
- Сложность миграции при изменениях
- Нет обратной совместимости

## ✅ Созданные решения

### 1. **Новая библиотека `libs/contracts-kafka`**

```
libs/contracts-kafka/
├── src/
│   ├── shared/
│   │   ├── base-schemas.ts      # Базовые Kafka схемы
│   │   └── topics.ts            # Топики и consumer groups
│   ├── v1/
│   │   ├── device-commands.ts   # Команды устройств
│   │   ├── device-events.ts     # События устройств
│   │   ├── user-events.ts       # События пользователей
│   │   ├── certificate-events.ts # События сертификатов
│   │   └── integration-events.ts # MQTT/REST интеграция
│   ├── adapters/
│   │   └── legacy-adapters.ts   # Адаптеры для миграции
│   └── index.ts                 # Главный экспорт
├── examples/
│   └── nestjs-integration.ts    # Пример интеграции
├── MIGRATION.md                 # Руководство по миграции
└── README.md                    # Документация
```

### 2. **Строгая схема Kafka-событий**

#### Базовое событие:

```typescript
{
  eventType: "device.command.rpc",
  correlationId: "uuid",
  timestamp: "2025-01-29T10:30:00Z",
  source: {
    type: "backend",
    id: "device-service"
  },
  __version: "v1",
  payload: { /* типизированные данные */ }
}
```

#### Типы событий:

- **Commands**: `*.command.*` - команды для выполнения
- **Events**: `*.created`, `*.updated`, `*.deleted` - доменные события
- **Responses**: `*.response.*` - ответы на команды
- **Integration**: `mqtt.*`, `rest.*` - интеграционные события

### 3. **Контракты по доменам**

#### Device Domain:

- **Commands**: `device.command.rpc`, `device.command.bind`, `device.command.ota`
- **Events**: `device.registered`, `device.bound`, `device.status.changed`
- **Telemetry**: `device.telemetry.received`, `device.alert.raised`

#### User Domain:

- **Commands**: `user.command.create`, `user.command.update`
- **Events**: `user.created`, `user.updated`, `auth.user.signedIn`

#### Certificate Domain:

- **Commands**: `certificate.command.create`, `certificate.command.revoke`
- **Events**: `certificate.created`, `certificate.expiring`

### 4. **Миграционные адаптеры**

```typescript
// REST → Kafka
const kafkaCommand = adaptRestBindDeviceToKafka(
  restRequest,
  userId,
  correlationId
);

// MQTT → Kafka
const kafkaEvent = adaptMqttTelemetryToKafka(mqttMessage);

// Kafka → REST
const restResponse = adaptKafkaDeviceBoundToRest(kafkaEvent);
```

## 🚀 План миграции

### Этап 1: Параллельная работа (Feature Flags)

```typescript
const USE_KAFKA_EVENTS = process.env.FEATURE_KAFKA_EVENTS === 'true';

if (USE_KAFKA_EVENTS) {
  await this.kafkaProducer.send(kafkaCommand);
} else {
  return this.legacyMethod(request);
}
```

### Этап 2: Адаптеры в контроллерах

```typescript
@Post('bind-qr')
async bindDeviceQR(@Body() body, @CurrentUser() user) {
  // Конвертируем REST → Kafka
  const kafkaCommand = adaptRestBindDeviceToKafka(body, user.id, correlationId);
  await this.kafkaProducer.send(kafkaCommand);

  // Ждем ответ и конвертируем Kafka → REST
  const response = await this.waitForResponse(correlationId);
  return adaptKafkaDeviceBoundToRest(response);
}
```

### Этап 3: Постепенное отключение legacy

1. **Фаза A**: Оба пути активны
2. **Фаза B**: Kafka primary, REST fallback
3. **Фаза C**: Только Kafka

## 🔧 Технические рекомендации

### 1. **Установка зависимостей**

```bash
npm install kafkajs @nestjs/microservices
nx generate @nx/js:library contracts-kafka --directory=libs
```

### 2. **Настройка Nx workspace**

```json
// libs/contracts-kafka/project.json
{
  "name": "@iot-hub/contracts-kafka",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/libs/contracts-kafka",
        "tsConfig": "libs/contracts-kafka/tsconfig.lib.json"
      }
    }
  }
}
```

### 3. **Обновление зависимостей в apps/backend**

```typescript
// apps/backend/src/app.module.ts
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [
    // ... существующие модули
    KafkaModule,
  ],
})
export class AppModule {}
```

### 4. **Kafka Producer/Consumer setup**

```typescript
// apps/backend/src/kafka/kafka.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'iot-hub-backend',
            brokers: ['kafka:9092'],
          },
          consumer: {
            groupId: ConsumerGroups.DeviceService,
          },
        },
      },
    ]),
  ],
  providers: [KafkaProducerService, KafkaResponseAwaiterService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
```

## ⚠️ Проблемные области

### 1. **Контракты не подходящие для Kafka**

- `libs/contracts/src/lib/contracts.ts` - REST-only контракты
- `libs/contracts/src/lib/health-contracts.ts` - HTTP health checks
- `libs/contracts/src/lib/metrics-contracts.ts` - REST метрики

**Решение**: Оставить как есть для REST API, создать отдельные Kafka события для мониторинга.

### 2. **MQTT схемы требуют доработки**

- `libs/contracts/mqtt/src/lib/mqtt-schemas.ts` - простые схемы без корреляции
- Отсутствует связь с Kafka событиями

**Решение**: Использовать адаптеры для конвертации MQTT → Kafka.

### 3. **Сложность миграции больших форм**

- Device configuration schemas с множественными полями
- QR generation с crypto операциями

**Решение**: Поэтапная миграция критических операций, остальные - через адаптеры.

## 📈 Преимущества новой архитектуры

### 1. **Масштабируемость**

- Асинхронная обработка команд
- Горизонтальное масштабирование consumer'ов
- Буферизация в Kafka для peak loads

### 2. **Наблюдаемость**

- Полная трейсируемость через `correlationId`
- Аудит через `source` информацию
- Structured logging событий

### 3. **Гибкость**

- Event sourcing возможности
- Легкое добавление новых consumer'ов
- Replay событий для debugging

### 4. **Надежность**

- Guaranteed delivery через Kafka
- Dead letter queues для failed messages
- At-least-once processing

## 🎯 Следующие шаги

### Немедленно:

1. ✅ Создать библиотеку `@iot-hub/contracts-kafka`
2. ✅ Написать базовые схемы и типы
3. ✅ Создать адаптеры для миграции

### Краткосрочно (1-2 недели):

1. Настроить Kafka в Docker Compose
2. Создать KafkaModule в NestJS
3. Мигрировать критический функционал (device binding)
4. Добавить feature flag для A/B тестирования

### Среднесрочно (1-2 месяца):

1. Мигрировать остальные device операции
2. Добавить user management события
3. Интегрировать certificate события
4. Добавить мониторинг и алерты

### Долгосрочно (3+ месяца):

1. Полностью отключить legacy REST direct calls
2. Добавить event sourcing capabilities
3. Оптимизировать Kafka partitioning
4. Добавить schema registry

## 🔗 Полезные ресурсы

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Zod Documentation](https://github.com/colinhacks/zod)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)
