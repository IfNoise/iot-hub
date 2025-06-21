# DeviceSimulator - Симулятор IoT Устройства

DeviceSimulator - это NestJS приложение, которое симулирует работу IoT устройства, включая:

- Эмуляцию криптографического чипа
- Полный флоу регистрации и подписания устройства
- Генерацию сертификатов через CSR
- Привязку устройства к пользователю
- Симуляцию работы сенсоров

## Возможности

### Криптографический чип

- Генерация RSA ключевых пар (2048, 3072, 4096 бит)
- Создание Certificate Signing Request (CSR)
- Подпись данных приватным ключом
- Проверка цифровых подписей

### Симуляция устройства

- Автоматическая регистрация в системе
- Запрос и получение сертификатов
- Привязка к пользователю
- Генерация данных сенсоров (температура, влажность, давление)

## API Endpoints

### Конфигурация устройства

```http
POST /api/simulator/configure
Content-Type: application/json

{
  "deviceId": "device-001",
  "model": "IoT Sensor v1.0",
  "firmwareVersion": "1.0.0",
  "backendUrl": "http://localhost:3000",
  "autoRegister": true
}
```

### Ручная регистрация

```http
POST /api/simulator/register
```

### Привязка к пользователю

```http
PUT /api/simulator/bind
Content-Type: application/json

{
  "userId": "user-uuid-here"
}
```

### Получение состояния устройства

```http
GET /api/simulator/status
```

Возвращает:

```json
{
  "device": {
    "id": "device-001",
    "status": "bound",
    "certificateFingerprint": "abc123...",
    "ownerId": "user-uuid"
  },
  "config": {
    "deviceId": "device-001",
    "model": "IoT Sensor v1.0",
    "firmwareVersion": "1.0.0",
    "backendUrl": "http://localhost:3000",
    "autoRegister": true
  },
  "cryptoChip": {
    "deviceId": "device-001",
    "hasKeyPair": true,
    "keyType": "RSA",
    "keySize": 2048
  }
}
```

### Получение данных сенсоров

```http
GET /api/simulator/sensors
```

Возвращает:

```json
{
  "success": true,
  "data": {
    "temperature": 23.5,
    "humidity": 65.2,
    "pressure": 1013.25,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Информация о криптографическом чипе

```http
GET /api/simulator/crypto-chip
```

### Остановка симуляции

```http
POST /api/simulator/stop
```

## Статусы устройства

- `uninitialized` - Устройство не инициализировано
- `initialized` - Устройство сконфигурировано, но не зарегистрировано
- `registered` - Устройство зарегистрировано в системе
- `bound` - Устройство привязано к пользователю
- `error` - Произошла ошибка

## Запуск

### Разработка

```bash
nx serve device-simulator
```

### Сборка

```bash
nx build device-simulator
```

### Тестирование

```bash
nx test device-simulator
```

## Использование

1. **Запустите симулятор:**

   ```bash
   nx serve device-simulator
   ```

2. **Сконфигурируйте устройство:**

   ```bash
   curl -X POST http://localhost:3001/api/simulator/configure \
     -H "Content-Type: application/json" \
     -d '{
       "deviceId": "test-device-001",
       "model": "Test IoT Device",
       "firmwareVersion": "1.0.0",
       "backendUrl": "http://localhost:3000",
       "autoRegister": true
     }'
   ```

3. **Проверьте состояние:**

   ```bash
   curl http://localhost:3001/api/simulator/status
   ```

4. **Привяжите к пользователю:**

   ```bash
   curl -X PUT http://localhost:3001/api/simulator/bind \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "your-user-uuid"
     }'
   ```

5. **Получите данные сенсоров:**
   ```bash
   curl http://localhost:3001/api/simulator/sensors
   ```

## Флоу работы

1. **Инициализация**: Создание ключевой пары в криптографическом чипе
2. **Регистрация**: Отправка публичного ключа в систему для регистрации устройства
3. **Получение сертификата**: Генерация CSR и получение подписанного сертификата
4. **Привязка**: Привязка устройства к конкретному пользователю
5. **Работа**: Непрерывная генерация данных сенсоров

## Архитектура

```
DeviceSimulator/
├── crypto-chip/           # Модуль криптографического чипа
│   ├── crypto-chip.module.ts
│   └── crypto-chip.service.ts
├── device-simulator/      # Основной модуль симулятора
│   ├── device-simulator.module.ts
│   ├── device-simulator.service.ts
│   └── device-simulator.controller.ts
└── app/                   # Корневой модуль приложения
    ├── app.module.ts
    ├── app.controller.ts
    └── app.service.ts
```

## Интеграция с IoT Hub

DeviceSimulator интегрируется с основным IoT Hub backend через REST API:

- `/devices/sign-device` - регистрация устройства
- `/devices/certificates/:deviceId/sign-csr` - подписание CSR
- `/devices/bind-device` - привязка устройства

Для полной интеграции убедитесь, что IoT Hub backend запущен на указанном в конфигурации URL.
