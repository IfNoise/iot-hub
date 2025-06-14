# IoT Device Simulator

## Обзор

Симулятор IoT устройства для тестирования MQTT RPC API. Полностью имитирует работу реального IoT устройства с поддержкой всех RPC методов, определенных в протоколе.

## Возможности

### 🚀 Основные функции:

- ✅ **MQTT подключение** к брокеру с автоматическим переподключением
- ✅ **RPC протокол** - полная поддержка команд и ответов
- ✅ **Симуляция сенсоров** - температура, влажность, давление
- ✅ **Управление таймерами** - дискретные и аналоговые
- ✅ **Регуляторы** - PID и дискретные регуляторы
- ✅ **Ирригация** - система полива
- ✅ **Логирование** - подробные логи всех операций

### 🎯 Поддерживаемые RPC методы:

- `getDeviceState` - получение полного состояния устройства
- `getSensors` - получение данных сенсоров
- `reboot` - перезагрузка устройства
- `updateDiscreteTimer` - обновление дискретного таймера
- `updateAnalogTimer` - обновление аналогового таймера
- `updateDiscreteRegulator` - обновление дискретного регулятора
- `updateAnalogRegulator` - обновление аналогового регулятора
- `updateIrrigator` - обновление настроек ирригатора

## Установка и запуск

### Предварительные требования

1. **Node.js** (версия 14 или выше)
2. **MQTT брокер** (например, Mosquitto)
3. **Зависимости npm**:
   ```bash
   npm install mqtt
   ```

### Установка MQTT брокера

#### Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

#### macOS:

```bash
brew install mosquitto
brew services start mosquitto
```

#### Docker:

```bash
docker run -it -p 1883:1883 eclipse-mosquitto
```

## Использование

### Быстрый запуск

```bash
# Запуск с параметрами по умолчанию
./start-device-simulator.sh

# Запуск с кастомными параметрами
./start-device-simulator.sh user123 device456 localhost 1883
```

### Ручной запуск

```bash
# Базовый запуск
node device-simulator.js --user-id test-user --device-id test-device

# Полный набор параметров
node device-simulator.js \
    --user-id user123 \
    --device-id device456 \
    --mqtt-host localhost \
    --mqtt-port 1883 \
    --keepalive 60 \
    --qos 1
```

### Параметры командной строки

| Параметр      | Описание                               | По умолчанию  |
| ------------- | -------------------------------------- | ------------- |
| `--user-id`   | ID пользователя (владельца устройства) | `test-user`   |
| `--device-id` | Уникальный ID устройства               | `test-device` |
| `--mqtt-host` | Хост MQTT брокера                      | `localhost`   |
| `--mqtt-port` | Порт MQTT брокера                      | `1883`        |
| `--keepalive` | Интервал keepalive в секундах          | `60`          |
| `--qos`       | Уровень QoS для MQTT                   | `1`           |

## Тестирование

### Автоматическое тестирование

Запустите полный тест симулятора и API:

```bash
./test-device-simulator.sh
```

Этот скрипт:

1. ✅ Проверяет доступность MQTT брокера
2. ✅ Проверяет работу API сервера
3. ✅ Запускает симулятор в фоне
4. ✅ Выполняет серию RPC команд
5. ✅ Показывает результаты тестирования
6. ✅ Мониторит устройство в реальном времени

### Ручное тестирование

#### 1. Проверка статуса MQTT API:

```bash
curl -X POST http://localhost:3000/api/mqtt/status
```

#### 2. Получение состояния устройства:

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "deviceId": "test-device",
    "method": "getDeviceState",
    "timeout": 5000
  }'
```

#### 3. Получение данных сенсоров:

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "deviceId": "test-device",
    "method": "getSensors",
    "timeout": 5000
  }'
```

#### 4. Обновление таймера:

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "deviceId": "test-device",
    "method": "updateDiscreteTimer",
    "params": {
      "id": 1,
      "enabled": true,
      "schedule": "0 8 * * *",
      "duration": 300,
      "channel": 1
    },
    "timeout": 5000
  }'
```

## Структура симулированного устройства

### Состояние устройства

```json
{
  "status": "online",
  "uptime": 123456,
  "temperature": 23.5,
  "humidity": 45.2,
  "pressure": 1013.25,
  "discreteTimers": [
    {
      "id": 1,
      "enabled": false,
      "schedule": "",
      "duration": 0,
      "channel": 1,
      "lastRun": null
    }
  ],
  "analogTimers": [...],
  "discreteRegulators": [...],
  "analogRegulators": [...],
  "irrigators": [...],
  "lastUpdate": "2025-06-14T15:30:00.000Z"
}
```

### Сенсоры

- **Температура**: 20-30°C с случайными изменениями
- **Влажность**: 30-70% с случайными изменениями
- **Давление**: 1000-1030 hPa с случайными изменениями
- **Обновление**: каждые 5 секунд

### Таймеры и регуляторы

- **Дискретные таймеры**: 2 канала, управление включением/выключением
- **Аналоговые таймеры**: 1 канал, управление значением
- **Дискретные регуляторы**: термостат с гистерезисом
- **Аналоговые регуляторы**: PID регулятор влажности
- **Ирригаторы**: система полива по расписанию

## MQTT Topics

### Входящие команды:

```
users/{userId}/devices/{deviceId}/rpc/command
```

### Исходящие ответы:

```
users/{userId}/devices/{deviceId}/rpc/response
```

## Логирование

Симулятор выводит подробные логи:

```
🚀 Инициализация симулятора устройства:
   👤 User ID: test-user
   📱 Device ID: test-device
   📡 MQTT: mqtt://localhost:1883
   📥 Command Topic: users/test-user/devices/test-device/rpc/command
   📤 Response Topic: users/test-user/devices/test-device/rpc/response
✅ Подключен к MQTT брокеру: mqtt://localhost:1883
📥 Подписка на команды: users/test-user/devices/test-device/rpc/command
🎯 Симулятор устройства запущен и готов к работе!
📥 Получена команда: getDeviceState (ID: abc123)
📤 Отправлен ответ: abc123 (success)
```

## Примеры использования

### Разработка и тестирование

```bash
# Запуск для разработки
./start-device-simulator.sh dev-user dev-device

# Мониторинг в отдельном терминале
tail -f simulator.log
```

### Нагрузочное тестирование

```bash
# Запуск нескольких устройств
for i in {1..5}; do
  node device-simulator.js --user-id user$i --device-id device$i &
done
```

### CI/CD тестирование

```bash
# Автоматическое тестирование в CI
./test-device-simulator.sh
if [ $? -eq 0 ]; then
  echo "✅ Все тесты прошли"
else
  echo "❌ Тесты провалились"
  exit 1
fi
```

## Устранение неполадок

### Симулятор не подключается к MQTT

1. Проверьте, что MQTT брокер запущен:

   ```bash
   mosquitto_pub -h localhost -p 1883 -t test -m "test"
   ```

2. Проверьте логи симулятора:
   ```bash
   tail -f simulator.log
   ```

### API не отвечает

1. Убедитесь, что backend сервер запущен на порту 3000
2. Проверьте статус MQTT в API:
   ```bash
   curl -X POST http://localhost:3000/api/mqtt/status
   ```

### Команды не доходят до устройства

1. Проверьте правильность user-id и device-id
2. Убедитесь, что симулятор подписался на правильный topic
3. Проверьте логи backend сервера

## Архитектура

```
Backend API  ←→  MQTT Broker  ←→  Device Simulator
     ↓               ↓                ↓
  REST API      MQTT Topics      RPC Handler
  Controller    Command/Response   Device State
  Validation    QoS/Retry Logic   Sensor Simulation
```

## Файлы проекта

- `device-simulator.js` - основной симулятор устройства
- `start-device-simulator.sh` - скрипт быстрого запуска
- `test-device-simulator.sh` - автоматическое тестирование
- `simulator.log` - лог файл симулятора (создается при запуске)

## Совместимость

- ✅ Node.js 14+
- ✅ MQTT 3.1.1 / 5.0
- ✅ Linux / macOS / Windows
- ✅ Docker / Kubernetes
- ✅ CI/CD pipelines

## Заключение

Симулятор предоставляет полную имитацию IoT устройства для разработки и тестирования MQTT RPC API. Все функции реального устройства реализованы и готовы к использованию! 🚀
