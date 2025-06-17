# API Документация

## Обзор API

IoT Hub предоставляет RESTful API для управления устройствами, пользователями и их взаимодействием.

### Базовый URL

```
http://localhost:3000/api
```

### Аутентификация

API использует JWT Bearer токены для аутентификации:

```http
Authorization: Bearer <your-jwt-token>
```

## Swagger UI

Интерактивная документация API доступна по адресу:

```
http://localhost:3000/api/docs
```

## Основные эндпоинты

### Health Check

```http
GET /api/health
```

Проверка состояния системы.

**Ответ:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Устройства

#### Получить список устройств

```http
GET /api/devices
```

**Параметры запроса:**

- `page` (optional): Номер страницы (по умолчанию: 1)
- `limit` (optional): Количество записей на странице (по умолчанию: 10)
- `status` (optional): Фильтр по статусу устройства

**Ответ:**

```json
{
  "data": [
    {
      "id": "device-123",
      "name": "Temperature Sensor #1",
      "status": "online",
      "lastSeen": "2024-01-01T12:00:00.000Z",
      "userId": "user-123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

#### Создать устройство

```http
POST /api/devices
```

**Тело запроса:**

```json
{
  "name": "My IoT Device",
  "type": "sensor",
  "description": "Temperature and humidity sensor"
}
```

#### Привязать устройство к пользователю

```http
POST /api/devices/bind
```

**Тело запроса:**

```json
{
  "deviceId": "device-123",
  "fingerprint": "AA:BB:CC:DD:EE:FF",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n..."
}
```

### Сертификаты

#### Подписать CSR

```http
POST /api/certificates/sign-csr
```

**Тело запроса:**

```json
{
  "csrPem": "-----BEGIN CERTIFICATE REQUEST-----\n..."
}
```

**Ответ:**

```json
{
  "certificatePem": "-----BEGIN CERTIFICATE-----\n...",
  "fingerprint": "AA:BB:CC:DD:EE:FF"
}
```

### Пользователи

#### Получить профиль пользователя

```http
GET /api/users/profile
```

**Ответ:**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Коды ошибок

| Код | Описание              |
| --- | --------------------- |
| 200 | OK                    |
| 201 | Created               |
| 400 | Bad Request           |
| 401 | Unauthorized          |
| 403 | Forbidden             |
| 404 | Not Found             |
| 500 | Internal Server Error |

## Примеры использования

### Привязка нового устройства

1. Пользователь сканирует QR-код устройства
2. Приложение извлекает `deviceId`, `fingerprint` и `publicKey`
3. Выполняется запрос на привязку:

```bash
curl -X POST http://localhost:3000/api/devices/bind \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32-001",
    "fingerprint": "AA:BB:CC:DD:EE:FF",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n..."
  }'
```

### Получение статуса устройства

```bash
curl -X GET http://localhost:3000/api/devices/ESP32-001 \
  -H "Authorization: Bearer <token>"
```

## Ограничения по скорости

API имеет ограничения по скорости запросов:

- **Общие запросы**: 100 запросов в минуту на IP
- **Аутентификация**: 10 попыток в минуту на IP
- **Привязка устройств**: 5 запросов в минуту на пользователя

## Версионирование

Текущая версия API: `v1`

В будущем планируется поддержка версионирования через заголовки:

```http
Accept: application/vnd.iot-hub.v1+json
```

## Безопасность

### CORS

API настроен для работы с CORS. В production окружении следует ограничить разрешенные домены.

### Валидация

Все входящие данные валидируются с помощью Zod схем.

### Логирование

Все запросы логируются с помощью Pino. Чувствительные данные (токены, пароли) маскируются.

## Тестирование

Для тестирования API используйте:

1. **Swagger UI**: http://localhost:3000/api/docs
2. **Postman Collection**: (будет добавлена)
3. **curl примеры**: см. выше

## Поддержка

Если у вас есть вопросы по API:

1. Проверьте Swagger документацию
2. Изучите [примеры разработки](./DEVELOPMENT_EXAMPLES.md)
3. Создайте issue в GitHub репозитории
