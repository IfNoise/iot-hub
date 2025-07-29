# IoT Hub Kafka Contracts

Event-driven контракты для Kafka-архитектуры IoT Hub.

## Установка

```bash
npm install @iot-hub/contracts-kafka
```

## Использование

### Создание команды

```typescript
import { DeviceRpcCommand } from '@iot-hub/contracts-kafka';

const command: DeviceRpcCommand = {
  eventType: 'device.command.rpc',
  correlationId: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  source: { type: 'backend', id: 'device-service' },
  __version: 'v1',
  timeout: 30000,
  responseRequired: true,
  payload: {
    deviceId: 'device-123',
    method: 'getDeviceState',
    requestedBy: 'user-456',
  },
};
```

### Создание события

```typescript
import { DeviceBoundEvent } from '@iot-hub/contracts-kafka';

const event: DeviceBoundEvent = {
  eventType: 'device.bound',
  correlationId: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  source: { type: 'backend', id: 'device-service' },
  __version: 'v1',
  payload: {
    deviceId: 'device-123',
    userId: 'user-456',
    boundAt: new Date().toISOString(),
    deviceName: 'My IoT Device',
    boundBy: 'user',
  },
};
```

### Валидация сообщений

```typescript
import { AllKafkaMessageSchemas } from '@iot-hub/contracts-kafka';

try {
  const validatedMessage = AllKafkaMessageSchemas.parse(incomingMessage);
  console.log('Message is valid:', validatedMessage.eventType);
} catch (error) {
  console.error('Invalid message:', error);
}
```

## Структура

- `events/` - Kafka события (Commands, Domain Events, Integration Events)
- `schemas/` - Общие схемы и типы
- `v1/` - Версионированные контракты v1
- `shared/` - Общие типы для всех версий

## Принципы

1. **Event-First**: Все взаимодействия через события
2. **Строгая типизация**: Zod схемы для всех контрактов
3. **Версионирование**: Поддержка нескольких версий событий
4. **Корреляция**: correlationId для связи request/response
5. **Трейсинг**: source информация для каждого события

## Типы событий

- **Commands**: Команды для выполнения (device.command.execute)
- **Domain Events**: Бизнес-события (device.registered, user.created)
- **Integration Events**: События интеграции (device.telemetry.received)
- **Responses**: Ответы на команды (device.command.response)

## Топики Kafka

```typescript
import { KafkaTopics } from '@iot-hub/contracts-kafka';

// Device Commands
KafkaTopics.DeviceCommands; // 'device.commands.v1'
KafkaTopics.DeviceCommandResponses; // 'device.commands.responses.v1'

// Device Events
KafkaTopics.DeviceEvents; // 'device.events.v1'
KafkaTopics.DeviceTelemetry; // 'device.telemetry.v1'
KafkaTopics.DeviceAlerts; // 'device.alerts.v1'

// User Events
KafkaTopics.UserEvents; // 'user.events.v1'
KafkaTopics.AuthEvents; // 'auth.events.v1'
```

## Миграция

См. [MIGRATION.md](./MIGRATION.md) для подробного руководства по миграции с REST API на Kafka события.
