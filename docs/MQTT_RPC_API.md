# MQTT RPC API Documentation

## Обзор

MQTT RPC API предоставляет REST интерфейс для отправки команд IoT устройствам через MQTT брокер. Использует RPC (Remote Procedure Call) протокол для надежной доставки команд и получения ответов.

## Конфигурация

### Переменные окружения

```bash
# MQTT брокер
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_CLIENT_ID=iot-hub-backend

# MQTT настройки
MQTT_KEEPALIVE=60
MQTT_CLEAN_SESSION=true
MQTT_RECONNECT_PERIOD=2000
MQTT_CONNECT_TIMEOUT=30000
MQTT_QOS=1
MQTT_RETAIN=false

# MQTT Will (Last Will and Testament)
MQTT_WILL_TOPIC=will/topic
MQTT_WILL_PAYLOAD=backend-disconnected
MQTT_WILL_QOS=0
MQTT_WILL_RETAIN=false
MQTT_MAX_RECONNECT_ATTEMPTS=10
```

## API Endpoints

### 1. Отправка команды с ожиданием ответа

**POST** `/api/mqtt/device/command`

Отправляет RPC команду устройству и ожидает ответ.

#### Request Body

```typescript
interface DeviceCommand {
  userId: string; // ID пользователя (владельца устройства)
  deviceId: string; // ID устройства
  method: RpcMethod; // RPC метод для выполнения
  params?: any; // Параметры метода (опционально)
  timeout?: number; // Таймаут в мс (по умолчанию 5000)
}
```

#### Supported Methods

- `getDeviceState` - получить состояние устройства
- `getSensors` - получить данные сенсоров
- `reboot` - перезагрузить устройство
- `updateDiscreteTimer` - обновить дискретный таймер
- `updateAnalogTimer` - обновить аналоговый таймер
- `updateDiscreteRegulator` - обновить дискретный регулятор
- `updateAnalogRegulator` - обновить аналоговый регулятор
- `updateIrrigator` - обновить настройки ирригатора

#### Examples

##### Получить состояние устройства

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "device456",
    "method": "getDeviceState",
    "params": {},
    "timeout": 5000
  }'
```

##### Получить данные сенсоров

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "device456",
    "method": "getSensors",
    "timeout": 3000
  }'
```

##### Перезагрузить устройство

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "device456",
    "method": "reboot",
    "timeout": 10000
  }'
```

##### Обновить дискретный таймер

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "device456",
    "method": "updateDiscreteTimer",
    "params": {
      "id": "timer1",
      "enabled": true,
      "schedule": "0 6 * * *",
      "duration": 3600,
      "outputPin": 12
    }
  }'
```

#### Response Format

```typescript
interface DeviceCommandResponse {
  id: string; // ID запроса
  result?: any; // Результат выполнения (при успехе)
  error?: {
    // Информация об ошибке (при неудаче)
    code: number;
    message: string;
  };
  metadata?: {
    // Метаданные запроса
    executionTime: number; // Время выполнения в мс
    sentAt: string; // Время отправки
    receivedAt: string; // Время получения ответа
  };
}
```

#### Success Response Example

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "result": {
    "status": "online",
    "temperature": 23.5,
    "humidity": 45.2,
    "uptime": 86400
  },
  "metadata": {
    "executionTime": 150,
    "sentAt": "2024-01-15T10:30:00.000Z",
    "receivedAt": "2024-01-15T10:30:00.150Z"
  }
}
```

#### Error Response Example

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "error": {
    "code": -1,
    "message": "Device not responding"
  },
  "metadata": {
    "executionTime": 5000,
    "sentAt": "2024-01-15T10:30:00.000Z",
    "receivedAt": "2024-01-15T10:30:05.000Z"
  }
}
```

### 2. Отправка команды без ожидания ответа

**POST** `/api/mqtt/device/command/no-response`

Отправляет RPC команду устройству без ожидания ответа.

#### Request Body

```typescript
interface DeviceCommandNoResponse {
  userId: string; // ID пользователя
  deviceId: string; // ID устройства
  method: RpcMethod; // RPC метод
  params?: any; // Параметры метода
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command/no-response \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "device456",
    "method": "reboot"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Команда отправлена устройству",
  "metadata": {
    "sentAt": "2024-01-15T10:30:00.000Z",
    "method": "reboot",
    "deviceId": "device456",
    "userId": "user123"
  }
}
```

### 3. Проверка статуса MQTT подключения

**POST** `/api/mqtt/status`

Возвращает информацию о статусе подключения к MQTT брокеру.

#### Example

```bash
curl -X POST http://localhost:3000/api/mqtt/status
```

#### Response

```json
{
  "connected": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Codes

| HTTP Status | Description                           |
| ----------- | ------------------------------------- |
| 200         | Успешное выполнение                   |
| 400         | Неверные параметры запроса            |
| 408         | Таймаут ожидания ответа от устройства |
| 503         | MQTT сервис недоступен                |
| 500         | Внутренняя ошибка сервера             |

## JavaScript/TypeScript Examples

### Using fetch API

```typescript
async function sendDeviceCommand(
  userId: string,
  deviceId: string,
  method: string,
  params?: any,
  timeout = 5000
) {
  const response = await fetch('/api/mqtt/device/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      deviceId,
      method,
      params,
      timeout,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
try {
  const result = await sendDeviceCommand(
    'user123',
    'device456',
    'getDeviceState'
  );
  console.log('Device state:', result.result);
} catch (error) {
  console.error('Error:', error);
}
```

### Using axios

```typescript
import axios from 'axios';

const mqttApi = axios.create({
  baseURL: '/api/mqtt',
  headers: {
    'Content-Type': 'application/json',
  },
});

async function getDeviceState(userId: string, deviceId: string) {
  try {
    const response = await mqttApi.post('/device/command', {
      userId,
      deviceId,
      method: 'getDeviceState',
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data);
    }
    throw error;
  }
}
```

## Логирование

Сервис использует Pino для логирования всех операций:

- **INFO**: Успешные операции, подключения, отправка команд
- **WARN**: Предупреждения, переподключения
- **ERROR**: Ошибки подключения, таймауты, ошибки валидации

Логи включают контекстную информацию:

- userId, deviceId, method для отслеживания команд
- Время выполнения операций
- Детали ошибок

## Swagger Documentation

API автоматически документируется с помощью Swagger. Доступно по адресу:
`http://localhost:3000/api-docs`

## Testing

### Unit Tests

```bash
npm run test mqtt
```

### Integration Tests

```bash
npm run test:e2e mqtt
```

## Troubleshooting

### Частые проблемы

1. **MQTT клиент не подключен к брокеру**

   - Проверьте настройки MQTT брокера
   - Убедитесь, что брокер доступен
   - Проверьте учетные данные

2. **Таймаут ожидания ответа**

   - Увеличьте значение timeout
   - Проверьте, что устройство онлайн
   - Убедитесь, что устройство подписано на правильные топики

3. **Ошибки валидации**
   - Проверьте формат данных в params
   - Убедитесь, что method поддерживается
   - Проверьте типы данных в запросе
