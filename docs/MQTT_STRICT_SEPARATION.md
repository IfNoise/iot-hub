# MQTT Strict Architecture Separation - Итоговая Реализация

## Обзор

Реализована архитектура строгого разделения MQTT подключений в IoT Hub:

- **Устройства**: ТОЛЬКО mTLS на порту 8883 с обязательными клиентскими сертификатами
- **Backend**: TCP на порту 1883 (development) БЕЗ аутентификации или TLS на порту 8883 (production) БЕЗ клиентских сертификатов

## Ключевые Исправления

### 1. EMQX Конфигурация

- ✅ Fingerprint передается в поле `password` (не в отдельном поле)
- ✅ `clientId` = `deviceId` для устройств
- ✅ HTTP валидация на существующий endpoint `/api/devices/certificates/validate`
- ✅ TCP 1883 БЕЗ аутентификации для backend

### 2. Certificate Service

- ✅ CN в сертификате = `deviceId` (не `device-${deviceId}`)
- ✅ SAN содержит `deviceId` и `${deviceId}.iot-hub.local`
- ✅ Логика валидации: `commonName` == `clientId` == `deviceId`

### 3. Device Client

- ✅ `clientId` всегда равен `deviceId`
- ✅ Только mTLS подключения (`mqtts://`)
- ✅ Убран fallback на небезопасные методы

### 4. Удалены Лишние Компоненты

- ✅ Удален `MqttAuthController` (дублировал функционал)
- ✅ Используется существующий `CertificatesController.validateCertificate`

## Архитектура

### Устройства (mTLS Only)

**Порт**: 8883 (mqtts://)
**Аутентификация**: Обязательные клиентские сертификаты + HTTP валидация
**ClientId**: `deviceId` (строго равен ID устройства)
**Common Name**: `deviceId` (CN в сертификате = deviceId)

#### Процесс подключения:

1. Устройство → `mqtts://broker:8883` с клиентским сертификатом
2. EMQX извлекает сертификат из TLS handshake
3. EMQX → POST `/api/devices/certificates/validate`:
   ```json
   {
     "clientid": "device-123", // = deviceId
     "password": "ABC123DEF456...", // = certificate fingerprint
     "cert_common_name": "device-123", // CN из сертификата
     "cert_subject": "CN=device-123,O=IoT Hub,..."
   }
   ```
4. Backend проверяет:
   - Сертификат существует и активен
   - `clientId` == `deviceId` == `CN`
   - Сертификат не истек и не отозван
5. Возврат: `{"result": "allow"}` или `{"result": "deny"}`

### Backend (TCP/TLS без клиентских сертификатов)

**Development**: TCP 1883 (`mqtt://`) БЕЗ аутентификации
**Production**: TLS 8883 (`mqtts://`) БЕЗ клиентских сертификатов

## EMQX Configuration

```hocon
# TCP для backend development - БЕЗ аутентификации
listeners.tcp.default {
  bind = "0.0.0.0:1883"
  enable_authn = false
}

# SSL для устройств (mTLS) и backend production (TLS)
listeners.ssl.default {
  bind = "0.0.0.0:8883"
  ssl_options {
    cacertfile = "/opt/emqx/etc/certs/ca-cert.pem"
    certfile = "/opt/emqx/etc/certs/server-cert.pem"
    keyfile = "/opt/emqx/etc/certs/server-key.pem"
    verify = verify_peer
    fail_if_no_peer_cert = false  # Backend может подключиться без клиентского cert
  }
}

# HTTP аутентификация для mTLS клиентов
authentication = [
  {
    mechanism = password_based
    backend = http
    url = "http://backend:3000/api/devices/certificates/validate"
    body {
      clientid = "${clientid}"
      password = "${cert_fingerprint}"  # Fingerprint в поле password!
      cert_common_name = "${cert_common_name}"
      cert_subject = "${cert_subject}"
    }
  }
]
```

## Код Изменения

### CertificateService (certificate-mtls.service.ts)

```typescript
// CN теперь равен deviceId
subject[cnIndex].value = deviceId; // Было: device-${deviceId}

// SAN содержит deviceId
subjectAltName: {
  altNames: [
    { type: 2, value: `${deviceId}.iot-hub.local` },
    { type: 2, value: deviceId },
  ];
}
```

### MqttDeviceClient (device-client.ts)

```typescript
const options = {
  clientId: options.deviceId, // Всегда deviceId
  // ... mTLS настройки
};
```

### CertificatesController (certificates.controller.ts)

```typescript
// Endpoint уже существовал, используем его
@TsRestHandler(certificatesContract.validateCertificate)
async validateCertificate() {
  // body.password содержит fingerprint
  // body.clientid должен равняться deviceId
  // body.cert_common_name должен равняться deviceId

  const isValid = await this.certificateService.validateCertificateForMQTT(
    body.password,        // fingerprint
    body.cert_common_name, // CN
    body.clientid         // deviceId
  );
}
```

## Безопасность

### Принципы

1. **Строгое разделение**: Устройства НЕ могут использовать TCP
2. **Отсутствие fallback**: Device-simulator НЕ может подключиться без mTLS
3. **Идентификация**: `clientId` == `deviceId` == `CN` для устройств
4. **Централизация**: Один endpoint для всех проверок сертификатов

### Валидация

- Fingerprint из TLS handshake → EMQX → Backend в поле `password`
- CN из сертификата должен равняться deviceId
- ClientId должен равняться deviceId
- Сертификат должен быть активен и не истекший

## Тестирование

### Устройство (mTLS)

```bash
mosquitto_pub -h emqx -p 8883 \
  --cafile ca-cert.pem \
  --cert device-123-cert.pem \
  --key device-123-key.pem \
  -i device-123 \
  -t "devices/device-123/telemetry" \
  -m '{"temp": 25}'
```

### Backend Development (TCP)

```bash
mosquitto_pub -h emqx -p 1883 \
  -i backend-service \
  -t "rpc/device-123/command" \
  -m '{"method": "getStatus"}'
```

### Backend Production (TLS)

```bash
mosquitto_pub -h emqx -p 8883 \
  --cafile ca-cert.pem \
  -i backend-service \
  -t "rpc/device-123/command" \
  -m '{"method": "getStatus"}'
```

## Результат

✅ **Архитектура соответствует требованиям**:

- Устройства используют ТОЛЬКО mTLS
- Backend использует TCP (dev) или TLS без клиентских сертификатов (prod)
- Убрана вариативность и fallback
- Используются существующие точки валидации
- Fingerprint передается в поле password
- ClientId = deviceId, CN = deviceId
- Централизованная логика валидации

## Схема подключений

```
                    ┌─────────────────────────────────────┐
                    │            EMQX Broker             │
                    │                                     │
   IoT Devices      │  Port 8883 (mTLS)                  │  Backend Services
  ┌─────────────┐   │  ┌─────────────────────────────┐    │  ┌─────────────────┐
  │             │   │  │                             │    │  │                 │
  │ Device 1    │◄──┼──┤ • Client Cert Required      │    │  │ Backend (Dev)   │
  │ (mTLS only) │   │  │ • Server Cert Validation    │    │  │ TCP Port 1883   │
  │             │   │  │ • Certificate-based Auth    │    │  │ No TLS          │
  └─────────────┘   │  │                             │    │  └─────────────────┘
                    │  └─────────────────────────────┘    │
  ┌─────────────┐   │                                     │  ┌─────────────────┐
  │             │   │  Port 1883 (TCP)                    │  │                 │
  │ Device 2    │◄──┼──┤ • Backend Development only      │◄─┼──┤ Backend (Prod)  │
  │ (mTLS only) │   │  │ • No TLS                        │    │  │ TLS Port 8883   │
  │             │   │  │ • Simple Auth                   │    │  │ Server Cert     │
  └─────────────┘   │  └─────────────────────────────┘    │  │ No Client Cert  │
                    │                                     │  └─────────────────┘
                    └─────────────────────────────────────┘
```

## Изменения в коде

### 1. Certificate Service

- **Изменено**: `DeviceCertificateResponse` теперь содержит только `mqtts://` URL
- **Удалено**: Fallback на TCP, все устройства получают только mTLS конфигурацию
- **Добавлено**: Валидация сертификатов для MQTT аутентификации

### 2. MqttConfigService

- **Добавлено**: `getBackendClientOptions(isProduction)` - разные опции для dev/prod
- **Добавлено**: `getDeviceClientOptions()` - всегда mTLS для устройств

### 3. MqttRpcService (Backend)

- **Изменено**: Использует environment-aware конфигурацию
- **Development**: TCP на порту 1883
- **Production**: TLS на порту 8883 без клиентских сертификатов

### 4. MqttDeviceClient (New)

- **Создан**: Специальный клиент для устройств с обязательным mTLS
- **Безопасность**: Строгая проверка сертификатов
- **Конфигурация**: Только mqtts:// протокол

### 5. Device Simulator

- **Изменено**: Использует `MqttDeviceClient` вместо `MqttRpcClient`
- **Требует**: Обязательные mTLS сертификаты в конфигурации
- **Удалено**: Fallback опции, поддержка только mTLS

### 6. EMQX Configuration

- **Port 1883**: Только для backend development (без TLS)
- **Port 8883**: Универсальный порт для mTLS (устройства) и TLS (backend prod)
- **Authentication**: HTTP endpoint для проверки типа подключения

### 7. MQTT Authentication Controller (New)

- **Endpoint**: `/api/mqtt/auth` для EMQX
- **Logic**: Разделяет аутентификацию по типу подключения
- **mTLS clients**: Проверка через сертификаты
- **TLS/TCP clients**: Проверка backend учетных данных

## Переменные окружения

### Backend Production

```bash
NODE_ENV=production
MQTT_HOST=emqx
MQTT_PORT=1883                    # Не используется в production
MQTT_SECURE_PORT=8883             # Используется в production
MQTT_TLS_CA=/path/to/ca-cert.pem  # Для проверки сервера
MQTT_TLS_SERVERNAME=emqx
# Клиентские сертификаты НЕ настраиваются для backend
```

### Backend Development

```bash
NODE_ENV=development
MQTT_HOST=emqx
MQTT_PORT=1883                    # Используется в development
MQTT_SECURE_PORT=8883             # Не используется в development
# TLS настройки НЕ нужны для development
```

### Device Simulator

```bash
# mTLS конфигурация - ОБЯЗАТЕЛЬНО
DEVICE_ID=demo-device-123
USER_ID=user-456
MQTT_HOST=emqx
MQTT_SECURE_PORT=8883             # ВСЕГДА используется
MQTT_TLS_CA=/path/to/ca-cert.pem
MQTT_TLS_CERT=/path/to/device-cert.pem
MQTT_TLS_KEY=/path/to/device-key.pem
MQTT_TLS_SERVERNAME=emqx
```

## Безопасность

### Устройства

✅ **Обязательная** взаимная аутентификация (mTLS)  
✅ **Проверка** клиентских сертификатов через backend  
✅ **Валидация** Common Name = Device ID  
✅ **Отзыв** сертификатов через базу данных

### Backend

✅ **Production**: TLS для шифрования трафика  
✅ **Development**: TCP для простоты разработки  
✅ **Изоляция**: Отдельная аутентификация от устройств

### EMQX

✅ **Разделение** типов подключений по портам и сертификатам  
✅ **Гибкая** аутентификация через HTTP webhook  
✅ **Логирование** всех попыток подключения

## Миграция

### Существующие устройства

1. Получить mTLS сертификаты через `/api/devices/{id}/certificate`
2. Обновить конфигурацию на использование только mqtts://
3. Удалить fallback логику из прошивки

### Backend сервисы

1. Настроить переменные окружения по environment
2. Убрать старые TLS настройки из development
3. Добавить CA сертификат для production

### EMQX

1. Обновить конфигурацию до emqx-mtls.conf
2. Перезапустить с новыми настройками аутентификации
3. Проверить работу HTTP webhook аутентификации

## Тестирование

### Устройства

```bash
# Тест mTLS подключения
mosquitto_pub -h emqx -p 8883 \
  --cafile ca-cert.pem \
  --cert device-cert.pem \
  --key device-key.pem \
  -t "users/test/devices/device1/telemetry" \
  -m '{"temp": 25}'
```

### Backend Development

```bash
# Тест TCP подключения
mosquitto_pub -h emqx -p 1883 \
  -i "backend-test" \
  -t "users/test/devices/device1/rpc/request" \
  -m '{"method": "ping"}'
```

### Backend Production

```bash
# Тест TLS подключения (без клиентского сертификата)
mosquitto_pub -h emqx -p 8883 \
  --cafile ca-cert.pem \
  -i "backend-prod" \
  -t "users/test/devices/device1/rpc/request" \
  -m '{"method": "getDeviceState"}'
```

## Мониторинг

- **EMQX Dashboard**: Подключения по портам и типам аутентификации
- **Backend Logs**: Успешные/неуспешные аутентификации MQTT
- **Certificate Service**: Валидация и отзыв сертификатов
- **Device Simulator**: Статус mTLS подключений

## Преимущества

1. **Безопасность**: Устройства не могут подключиться без сертификатов
2. **Простота**: Убрана вся fallback логика и вариативность
3. **Разделение**: Четкое разделение между устройствами и backend
4. **Масштабируемость**: Backend может работать в разных окружениях
5. **Управляемость**: Централизованная выдача и отзыв сертификатов
