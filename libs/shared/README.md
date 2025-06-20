# @iot-hub/shared

Общая библиотека для IoT Hub приложения, содержащая переиспользуемые компоненты, утилиты и инфраструктурные решения.

## Что включено

### 🛠️ Утилиты (Utils)

**RPC Utilities** - функции для работы с MQTT RPC:

- `getRequestTopic()` - генерация топиков для запросов
- `getResponseTopic()` - генерация топиков для ответов
- `createRpcRequest()` - создание MQTT RPC запросов
- `createWsRpcRequest()` - создание WebSocket RPC запросов
- `parseTopicComponents()` - разбор компонентов MQTT топика

### 📐 Типы (Types)

Базовые интерфейсы для RPC, устройств, пользователей и сертификатов.

### 🔧 Константы (Constants)

Общие константы: MQTT топики, коды ошибок, таймауты, роли, статусы и лимиты.

### 🏗️ Инфраструктура (Infra)

Абстрактный базовый MQTT клиент для наследования.

## Сборка

Run `nx build shared` to build the library.

## Тестирование

Run `nx test shared` to execute the unit tests via [Jest](https://jestjs.io).
