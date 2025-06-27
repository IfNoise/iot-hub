# Device Simulator - Обновленная версия

## 🚀 Обзор

Симулятор IoT устройства теперь поддерживает полную интеграцию с MQTT RPC архитектурой проекта. Включает:

- ✅ Имитацию криптографического чипа
- ✅ MQTT RPC клиент для обработки команд от backend
- ✅ Поддержку всех RPC методов (getDeviceState, getSensors, reboot и др.)
- ✅ Полный флоу регистрации устройства
- ✅ Симуляцию сенсоров с реалистичными данными

## 🔄 Изменения

### Новая функциональность

1. **MQTT RPC Integration**: Полная интеграция с MQTT RPC архитектурой
2. **Обработка команд**: Поддержка всех RPC методов из backend
3. **Улучшенная конфигурация**: Возможность настройки MQTT параметров
4. **Статус мониторинг**: Эндпоинты для проверки статуса MQTT

### Обновленные модули

- `MqttDeviceService`: Новый сервис для обработки MQTT RPC команд
- `MqttDeviceModule`: Модуль для MQTT функциональности
- `DeviceSimulatorService`: Обновлен для интеграции с MQTT
- `DeviceSimulatorController`: Добавлены новые эндпоинты

## 📡 MQTT RPC Methods

Симулятор поддерживает следующие RPC методы:

| Метод                     | Описание                      | Параметры                                      |
| ------------------------- | ----------------------------- | ---------------------------------------------- |
| `getDeviceState`          | Получить состояние устройства | `{}`                                           |
| `getSensors`              | Получить данные сенсоров      | `{}`                                           |
| `reboot`                  | Перезагрузить устройство      | `{}`                                           |
| `updateDiscreteTimer`     | Обновить дискретный таймер    | `{ id, enabled, schedule, duration, channel }` |
| `updateAnalogTimer`       | Обновить аналоговый таймер    | `{ id, enabled, schedule, duration, channel }` |
| `updateDiscreteRegulator` | Обновить дискретный регулятор | `{ id, enabled, threshold, hysteresis }`       |
| `updateAnalogRegulator`   | Обновить аналоговый регулятор | `{ id, enabled, setpoint, kp, ki, kd }`        |
| `updateIrrigator`         | Обновить настройки ирригатора | `{ id, enabled, schedule, duration, zones }`   |

## 🛠️ API Endpoints

### Основные эндпоинты

- `POST /api/simulator/configure` - Конфигурирование устройства
- `GET /api/simulator/status` - Получить статус устройства
- `GET /api/simulator/sensors` - Получить данные сенсоров
- `GET /api/simulator/mqtt/status` - Статус MQTT подключения

### Новый формат конфигурации

```json
{
  "deviceId": "device-001",
  "model": "IoT-Simulator-v2",
  "firmwareVersion": "2.0.0",
  "backendUrl": "http://localhost:3000",
  "autoRegister": true,
  "mqtt": {
    "brokerUrl": "mqtt://localhost:1883",
    "userId": "user-123",
    "token": "jwt-token-here",
    "qos": 1
  }
}
```

## 🚀 Запуск

### Разработка

```bash
# Запуск симулятора в режиме разработки
nx serve device-simulator

# Или
npm run start:dev device-simulator
```

### Production

```bash
# Сборка
nx build device-simulator

# Запуск
nx serve device-simulator --configuration=production
```

## 🧪 Тестирование

### Конфигурирование устройства

```bash
curl -X POST http://localhost:3001/api/simulator/configure \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-001",
    "model": "IoT-Simulator-v2",
    "firmwareVersion": "2.0.0",
    "backendUrl": "http://localhost:3000",
    "autoRegister": true,
    "mqtt": {
      "brokerUrl": "mqtt://localhost:1883",
      "userId": "test-user",
      "qos": 1
    }
  }'
```

### Проверка статуса

```bash
# Общий статус
curl http://localhost:3001/api/simulator/status

# Статус MQTT
curl http://localhost:3001/api/simulator/mqtt/status

# Данные сенсоров
curl http://localhost:3001/api/simulator/sensors
```

### Тестирование RPC команд через backend

```bash
# Отправка команды через backend MQTT RPC API
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "deviceId": "test-device-001",
    "method": "getDeviceState",
    "timeout": 5000
  }'
```

## 🔧 Архитектура

```text
DeviceSimulator
├── main.ts                      # Точка входа
├── app/
│   ├── app.module.ts           # Главный модуль
│   └── app.controller.ts       # Базовый контроллер
├── device-simulator/           # Основная логика симулятора
│   ├── device-simulator.module.ts
│   ├── device-simulator.service.ts
│   └── device-simulator.controller.ts
├── mqtt/                       # MQTT RPC функциональность
│   ├── mqtt-device.module.ts
│   └── mqtt-device.service.ts  # Обработка RPC команд
└── crypto-chip/               # Симуляция криптографического чипа
    ├── crypto-chip.module.ts
    └── crypto-chip.service.ts
```

## 🔗 Интеграция

Симулятор интегрируется с:

- **Backend MQTT RPC Service**: Получает и обрабатывает команды
- **Shared Library**: Использует общий MQTT RPC клиент
- **Contracts**: Поддерживает все контракты MQTT RPC
- **Crypto Module**: Имитирует работу криптографического чипа

## 📊 Мониторинг

Симулятор предоставляет:

- Логирование всех операций
- Статус MQTT подключения
- Информацию о состоянии устройства
- Данные сенсоров в реальном времени
- Информацию о криптографическом чипе

## 🐛 Отладка

### Проблемы с MQTT

```bash
# Проверить статус MQTT
curl http://localhost:3001/api/simulator/mqtt/status

# Посмотреть логи
docker logs device-simulator
```

### Проблемы с командами

1. Убедитесь что MQTT брокер запущен
2. Проверьте что backend MQTT RPC сервис работает
3. Убедитесь что устройство подключено к правильному топику
4. Проверьте логи симулятора на ошибки

## 🔄 Следующие шаги

1. Добавить более сложную симуляцию устройств
2. Реализовать персистентное хранение состояния
3. Добавить метрики и мониторинг
4. Поддержка нескольких устройств в одном симуляторе
5. WebSocket интерфейс для real-time мониторинга
