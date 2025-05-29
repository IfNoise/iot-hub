# IOT-Core

🚀 **Современная TypeScript библиотека для IoT-устройств с поддержкой MQTT и WebSocket RPC**

Легкая, типобезопасная библиотека для реализации RPC-механизма поверх MQTT и WebSocket протоколов. Идеально подходит для IoT-проектов, систем автоматизации и управления устройствами.

---

## ✨ Особенности

- 🎯 **Типобезопасность** — полная поддержка TypeScript с строгой типизацией и JSDoc комментариями
- 🔄 **Двойной протокол** — MQTT и WebSocket RPC в одной библиотеке
- ⚡ **Асинхронные вызовы** — Promise-based API с поддержкой таймаутов
- 🛡️ **Валидация данных** — встроенная валидация через Zod схемы
- 🔌 **Автопереподключение** — надежная работа в нестабильных сетях
- 📊 **Гибкое логирование** — встроенная поддержка различных логгеров
- 🎛️ **QoS поддержка** — настройка качества доставки (0, 1, 2)
- 🌐 **Кроссплатформенность** — Node.js, браузер, React Native

---

## 📦 Установка

```bash
npm install iot-core
# или
yarn add iot-core
# или
pnpm add iot-core
```

---

## 🚀 Быстрый старт

### MQTT RPC Client

```typescript
import { MqttRpcClient } from "iot-core";

/**
 * Создаем MQTT RPC клиент
 * @example
 * const client = new MqttRpcClient({
 *   brokerUrl: 'mqtt://localhost:1883',
 *   userId: 'user123',
 *   deviceId: 'device456',
 *   token: 'jwt-token',
 *   qos: 1,
 *   logger: console
 * });
 */
const client = new MqttRpcClient({
  brokerUrl: "mqtt://your-broker.com:1883",
  userId: "user-123",
  deviceId: "device-456",
  token: "your-jwt-token",
  qos: 1,
  logger: console,
});

// Подключение
client.onConnect(() => {
  console.log("🔗 MQTT подключен");
  client.onResponseTopic();
});

// Отправка команды
try {
  const response = await client.sendCommandAsync(
    "user-123",
    "device-456",
    "getDeviceState",
    {},
    5000
  );
  console.log("📱 Ответ устройства:", response);
} catch (error) {
  console.error("❌ Ошибка:", error);
}
```

### WebSocket RPC Client

```typescript
import { WsRpcClient } from "iot-core";

/**
 * Создаем WebSocket RPC клиент
 * @param url - URL WebSocket сервера с deviceId в query параметрах
 * @param logger - Объект для логирования (опционально)
 */
const wsClient = new WsRpcClient(
  "ws://localhost:8080?deviceId=device-123",
  console
);

// Отправка команды
const request = {
  id: crypto.randomUUID(),
  deviceId: "device-123",
  method: "turnOnLed",
  params: { on: true },
};

const response = await wsClient.sendCommandAsync(request, 3000);
console.log("💡 LED включен:", response);
```

---

## 📚 JSDoc API Reference

### MqttRpcClient

Полнофункциональный MQTT RPC клиент с типобезопасностью и автоматической валидацией.

````typescript
/**
 * MQTT RPC клиент для отправки команд устройствам и получения ответов
 *
 * @example
 * ```typescript
 * const client = new MqttRpcClient({
 *   brokerUrl: 'mqtt://localhost:1883',
 *   userId: 'user123',
 *   deviceId: 'device456',
 *   token: 'jwt-token',
 *   qos: 1,
 *   logger: console
 * });
 *
 * client.onConnect(() => {
 *   console.log('Connected');
 *   client.onResponseTopic();
 * });
 *
 * const response = await client.sendCommandAsync('user1', 'dev1', 'getDeviceState', {});
 * ```
 */
class MqttRpcClient {
  /**
   * Создает новый экземпляр MQTT RPC клиента
   * @param options - Опции конфигурации клиента
   */
  constructor(options: MqttRpcClientOptions);

  /**
   * Устанавливает обработчик события подключения
   * @param callback - Функция, вызываемая при подключении
   */
  onConnect(callback: () => void): void;

  /**
   * Подписывается на топик ответов устройства
   */
  onResponseTopic(): void;

  /**
   * Отправляет команду устройству без ожидания ответа
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - Метод RPC
   * @param params - Параметры метода
   */
  sendCommand(
    userId: string,
    deviceId: string,
    method: RpcMethod,
    params?: RpcMethodParams
  ): void;

  /**
   * Отправляет команду устройству и ожидает ответ
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - Метод RPC
   * @param params - Параметры метода
   * @param timeout - Таймаут ожидания ответа в миллисекундах (по умолчанию 5000)
   * @returns Promise с ответом устройства
   * @throws Error при таймауте или ошибке отправки
   */
  sendCommandAsync(
    userId: string,
    deviceId: string,
    method: RpcMethod,
    params?: RpcMethodParams,
    timeout?: number
  ): Promise<RpcResponse>;

  /**
   * Проверяет статус подключения к MQTT брокеру
   * @returns true если подключен, false если отключен
   */
  isConnected(): boolean;

  /**
   * Отключается от MQTT брокера
   * @param force - Принудительное отключение без ожидания
   */
  disconnect(force?: boolean): void;
}
````

#### MqttRpcClientOptions

```typescript
/**
 * Опции для создания MQTT RPC клиента
 */
interface MqttRpcClientOptions {
  /** URL MQTT брокера */
  brokerUrl: string;
  /** Идентификатор пользователя */
  userId: string;
  /** Идентификатор устройства */
  deviceId: string;
  /** JWT токен для аутентификации */
  token?: string;
  /** Имя пользователя для подключения (по умолчанию 'jwt') */
  username?: string;
  /** Уровень качества доставки сообщений (0, 1, 2) */
  qos?: 0 | 1 | 2;
  /** Полезная нагрузка для Last Will сообщения */
  willPayload?: string;
  /** Объект для логирования событий */
  logger?: Logger;
}
```

### WsRpcClient

WebSocket RPC клиент для прямого соединения с устройствами.

````typescript
/**
 * WebSocket RPC клиент для отправки команд устройствам через WebSocket
 *
 * @example
 * ```typescript
 * const wsClient = new WsRpcClient('ws://localhost:8080?deviceId=device-123', console);
 *
 * const request = {
 *   id: crypto.randomUUID(),
 *   deviceId: 'device-123',
 *   method: 'turnOnLed',
 *   params: { on: true }
 * };
 *
 * const response = await wsClient.sendCommandAsync(request, 3000);
 * ```
 */
class WsRpcClient {
  /**
   * Создает новый экземпляр WebSocket RPC клиента
   * @param url - URL WebSocket сервера
   * @param logger - Объект для логирования (опционально)
   */
  constructor(url: string, logger?: Logger);

  /**
   * Отправляет команду устройству без ожидания ответа
   * @param request - RPC запрос
   */
  sendCommand(request: RpcRequest): void;

  /**
   * Отправляет команду устройству и ожидает ответ
   * @param request - RPC запрос
   * @param timeout - Таймаут ожидания ответа в миллисекундах (по умолчанию 5000)
   * @returns Promise с ответом устройства
   * @throws Error при таймауте или ошибке отправки
   */
  sendCommandAsync(request: RpcRequest, timeout?: number): Promise<RpcResponse>;

  /**
   * Проверяет статус подключения к WebSocket серверу
   * @returns true если подключен, false если отключен
   */
  isConnected(): boolean;

  /**
   * Отключается от WebSocket сервера
   */
  disconnect(): void;
}
````

---

## 🎛️ RPC Методы

Библиотека поддерживает следующие предустановленные RPC методы с автоматической валидацией:

| Метод                     | Параметры                 | Описание                         |
| ------------------------- | ------------------------- | -------------------------------- |
| `turnOnLed`               | `{ on: boolean }`         | Управление LED                   |
| `setThreshold`            | `{ threshold: number }`   | Установка порога                 |
| `getDeviceState`          | `{}`                      | Получение состояния устройства   |
| `getSensors`              | `{}`                      | Чтение данных сенсоров           |
| `reboot`                  | `{}`                      | Перезагрузка устройства          |
| `updateDevice`            | `DeviceUpdateParams`      | Обновление настроек устройства   |
| `updateDiscreteTimer`     | `DiscreteTimerParams`     | Настройка дискретного таймера    |
| `updateAnalogTimer`       | `AnalogTimerParams`       | Настройка аналогового таймера    |
| `updateDiscreteRegulator` | `DiscreteRegulatorParams` | Настройка дискретного регулятора |
| `updateAnalogRegulator`   | `AnalogRegulatorParams`   | Настройка аналогового регулятора |
| `updateIrrigator`         | `IrrigatorParams`         | Настройка системы полива         |

---

## 🔧 Валидация и схемы

Все RPC методы автоматически валидируются через Zod схемы:

```typescript
import { validateRpc, createValidatedRpcRequest } from "iot-core";

// Валидация метода и параметров
try {
  validateRpc("turnOnLed", { on: true });
  console.log("✅ Валидация прошла успешно");
} catch (error) {
  console.error("❌ Ошибка валидации:", error.message);
}

// Создание валидированного запроса для MQTT
const mqttRequest = createValidatedRpcRequest(
  "user-123",
  "device-456",
  "setThreshold",
  { threshold: 25.5 }
);

// Создание валидированного запроса для WebSocket
const wsRequest = createValidatedWsRpcRequest(
  "device-456",
  "getDeviceState",
  {}
);
```

---

## 🏗️ Архитектура

### MQTT Топики

```
users/{userId}/devices/{deviceId}/rpc/request   # Команды к устройству
users/{userId}/devices/{deviceId}/rpc/response  # Ответы от устройства
```

### WebSocket

```
ws://server:port?deviceId={deviceId}  # Подключение устройства
```

### Структура RPC сообщений

**Запрос:**

```typescript
{
  id: string;           // Уникальный ID запроса
  deviceId: string;     // ID устройства
  method: string;       // Название метода
  params?: any;         // Параметры метода
}
```

**Ответ:**

```typescript
{
  id: string;           // ID запроса
  result?: any;         // Результат выполнения
  error?: {             // Ошибка (если есть)
    code: number;
    message: string;
  };
}
```

---

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты в watch режиме
npm run test:watch

# Покрытие кода
npm run test:coverage
```

---

## 📝 Примеры использования

### Управление LED

```typescript
// Включить LED
await client.sendCommandAsync("user-1", "device-1", "turnOnLed", { on: true });

// Выключить LED
await client.sendCommandAsync("user-1", "device-1", "turnOnLed", { on: false });
```

### Чтение сенсоров

```typescript
const sensors = await client.sendCommandAsync(
  "user-1",
  "device-1",
  "getSensors",
  {}
);
console.log("🌡️ Температура:", sensors.result.temperature);
console.log("💧 Влажность:", sensors.result.humidity);
```

### Обработка ошибок

```typescript
try {
  const result = await client.sendCommandAsync(
    "user-1",
    "device-1",
    "unknown-method",
    {}
  );
} catch (error) {
  if (error.message.includes("timeout")) {
    console.log("⏰ Устройство не отвечает");
  } else if (error.message.includes("Unknown RPC method")) {
    console.log("❓ Неизвестный метод");
  }
}
```

### Настройка таймеров и регуляторов

```typescript
// Настройка дискретного таймера
await client.sendCommandAsync("user-1", "device-1", "updateDiscreteTimer", {
  id: "timer1",
  enabled: true,
  interval: 60000, // 1 минута
  outputPin: "D1",
});

// Настройка аналогового регулятора
await client.sendCommandAsync("user-1", "device-1", "updateAnalogRegulator", {
  id: "temp_regulator",
  enabled: true,
  setpoint: 25.0,
  inputPin: "A0",
  outputPin: "D2",
  pidSettings: {
    kp: 1.0,
    ki: 0.1,
    kd: 0.01,
  },
});
```

---

## 🤝 Вклад в проект

1. Fork проект
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📄 Лицензия

ISC © IOT-Hub Team

---

## 🆘 Поддержка

- 📖 [Документация](https://github.com/your-username/iot-hub/wiki)
- 🐛 [Сообщить об ошибке](https://github.com/your-username/iot-hub/issues)
- 💬 [Обсуждения](https://github.com/your-username/iot-hub/discussions)

---

**Сделано с ❤️ для IoT сообщества**
