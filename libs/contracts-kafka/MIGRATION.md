# Миграция на Kafka Event-Driven архитектуру

## Обзор проблем текущих контрактов

### 1. **REST-ориентированность**

```typescript
// ❌ Проблема: Контракты завязаны на HTTP
export const devicesContract = c.router({
  bindDeviceQR: {
    method: 'POST',
    path: '/devices/bind-qr',
    body: BindDeviceRequestSchema,
    responses: { 200: ..., 400: ..., 409: ... }
  }
});
```

### 2. **Отсутствие единой схемы событий**

```typescript
// ❌ Проблема: Нет correlationId, source, timestamp
export const DeviceStatusChangedSchema = z.object({
  type: z.literal('DeviceStatusChanged'),
  deviceId: z.string(),
  timestamp: z.string().datetime(), // Только timestamp
  payload: z.object({...})
});
```

### 3. **Смешанная ответственность**

```typescript
// ❌ Проблема: Валидация + бизнес-логика в схемах
export const DeviceCommandSchema = BaseDeviceCommandSchema.extend({
  method: z.enum(['getDeviceState', 'getSensors']),
  timeout: z.number().int().min(1000).max(30000).default(5000), // Бизнес-логика
});
```

## Новая Kafka-архитектура

### 1. **Базовая схема событий**

```typescript
// ✅ Решение: Единая базовая схема
export const BaseKafkaEventSchema = z.object({
  eventType: z.string(),
  correlationId: CorrelationIdSchema,
  timestamp: TimestampSchema,
  source: EventSourceSchema,
  __version: z.string().default('v1'),
});
```

### 2. **Строгое разделение типов событий**

```typescript
// ✅ Commands - для выполнения действий
export const DeviceRpcCommandSchema = BaseKafkaCommandSchema.extend({
  eventType: z.literal('device.command.rpc'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    method: z.enum(['getDeviceState', 'getSensors']),
    requestedBy: UserIdSchema,
  }),
});

// ✅ Events - доменные события
export const DeviceBoundEventSchema = BaseDomainEventSchema.extend({
  eventType: z.literal('device.bound'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    userId: UserIdSchema,
    boundAt: z.string().datetime(),
  }),
});

// ✅ Responses - ответы на команды
export const DeviceRpcResponseSchema = BaseKafkaResponseSchema.extend({
  eventType: z.literal('device.response.rpc'),
  payload: z.object({
    deviceId: DeviceIdSchema,
    result: z.record(z.any()).optional(),
  }),
});
```

## План поэтапной миграции

### Этап 1: Создание новых контрактов (✅ Выполнено)

- [x] Создана библиотека `libs/contracts-kafka`
- [x] Базовые схемы с `correlationId`, `source`, `timestamp`
- [x] Контракты для Device Commands/Events
- [x] Контракты для User Events
- [x] Контракты для Certificate Events
- [x] Контракты для Integration Events (MQTT/REST)
- [x] Адаптеры для legacy систем

### Этап 2: Параллельная работа (Feature Flags)

```typescript
// В приложении
const USE_KAFKA_EVENTS = process.env.FEATURE_KAFKA_EVENTS === 'true';

export class DeviceService {
  async bindDevice(request: BindDeviceRequest) {
    if (USE_KAFKA_EVENTS) {
      // Новый Kafka-подход
      await this.kafkaProducer.send({
        topic: KafkaTopics.DeviceCommands,
        messages: [
          {
            value: JSON.stringify(deviceBindCommand),
          },
        ],
      });
    } else {
      // Старый прямой подход
      return this.legacyBindDevice(request);
    }
  }
}
```

### Этап 3: Адаптеры для обратной совместимости

```typescript
// REST Controller остается, но внутри использует Kafka
@Controller('devices')
export class DevicesController {
  @Post('bind-qr')
  async bindDeviceQR(
    @Body() body: BindDeviceRequest,
    @CurrentUser() user: User
  ) {
    // Конвертируем REST запрос в Kafka команду
    const kafkaCommand = adaptRestBindDeviceToKafka(
      body,
      user.id,
      generateCorrelationId()
    );

    // Отправляем в Kafka
    await this.kafkaProducer.send({
      topic: KafkaTopics.DeviceCommands,
      messages: [{ value: JSON.stringify(kafkaCommand) }],
    });

    // Ждем ответ из Kafka (или возвращаем async response)
    const response = await this.waitForResponse(kafkaCommand.correlationId);

    // Конвертируем Kafka ответ обратно в REST формат
    return adaptKafkaDeviceBoundToRest(response);
  }
}
```

### Этап 4: Постепенное отключение legacy

1. **Фаза A**: Параллельная работа (оба пути активны)
2. **Фаза B**: Kafka primary, REST fallback
3. **Фаза C**: Только Kafka, legacy отключен

## Настройка Nx workspace

### Создание новой библиотеки

```bash
nx generate @nx/js:library contracts-kafka --bundler=tsc --unitTestRunner=jest --directory=libs --tags=npm:public
```

### Обновление зависимостей

```typescript
// libs/contracts-kafka/project.json
{
  "name": "@iot-hub/contracts-kafka",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/libs/contracts-kafka",
        "tsConfig": "libs/contracts-kafka/tsconfig.lib.json",
        "packageJson": "libs/contracts-kafka/package.json"
      }
    }
  }
}
```

### Обновление импортов в apps/backend

```typescript
// До (удалено из проекта)
// import { DeviceCommandSchema } from '@iot-hub/mqtt';

// После
import {
  DeviceRpcCommand,
  adaptMqttTelemetryToKafka,
} from '@iot-hub/contracts-kafka';
```

## Рекомендации по использованию

### 1. **Валидация входящих событий**

```typescript
import { AllKafkaMessageSchemas } from '@iot-hub/contracts-kafka';

@EventPattern(KafkaTopics.DeviceCommands)
async handleDeviceCommand(@Payload() message: unknown) {
  // Валидируем входящее сообщение
  const parsed = AllKafkaMessageSchemas.parse(message);

  if (parsed.eventType === 'device.command.rpc') {
    return this.handleRpcCommand(parsed);
  }
}
```

### 2. **Генерация событий**

```typescript
import { DeviceBoundEventSchema } from '@iot-hub/contracts-kafka';

// Создаем событие после привязки устройства
const event = DeviceBoundEventSchema.parse({
  eventType: 'device.bound',
  correlationId: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  source: { type: 'backend', id: 'device-service' },
  payload: {
    deviceId: device.id,
    userId: user.id,
    boundAt: new Date().toISOString(),
  },
});

await this.kafkaProducer.send({
  topic: KafkaTopics.DeviceEvents,
  messages: [{ value: JSON.stringify(event) }],
});
```

### 3. **Обработка ошибок и версионирования**

```typescript
try {
  const event = AllKafkaMessageSchemas.parse(message);

  // Проверяем версию
  if (event.__version !== 'v1') {
    throw new Error(`Unsupported version: ${event.__version}`);
  }

  await this.processEvent(event);
} catch (error) {
  // Отправляем в DLQ или логируем
  logger.error('Failed to process Kafka message', { error, message });
}
```

## Преимущества новой архитектуры

### 1. **Event-First дизайн**

- Все взаимодействия через события
- Четкое разделение Commands, Events, Responses
- Простота масштабирования

### 2. **Строгая типизация**

- Zod схемы для runtime валидации
- TypeScript типы для compile-time проверок
- Дискриминированные union'ы для type safety

### 3. **Версионирование**

- Поддержка множественных версий схем
- Graceful migration между версиями
- Обратная совместимость

### 4. **Наблюдаемость**

- `correlationId` для трейсинга
- `source` для аудита
- `timestamp` для временных меток
- Structured logging

### 5. **Масштабируемость**

- Асинхронная обработка
- Горизонтальное масштабирование consumer'ов
- Буферизация в Kafka

## Следующие шаги

1. **Установка зависимостей**

   ```bash
   npm install kafkajs @types/kafkajs
   ```

2. **Настройка Kafka Producer/Consumer в NestJS**
3. **Создание Kafka модуля**
4. **Миграция критических эндпоинтов** (device binding)
5. **Добавление мониторинга и логирования**
6. **Постепенное отключение REST direct calls**
