# mTLS Authentication для IoT устройств с EMQX

Этот документ описывает настройку взаимной TLS аутентификации (mTLS) для IoT устройств с использованием EMQX MQTT брокера.

## 🎯 Архитектура mTLS

```
┌─────────────────┐    mTLS (8883)    ┌─────────────────┐    HTTP     ┌─────────────────┐
│   IoT Device    │◄──────────────────►│   EMQX Broker   │◄───────────►│  IoT Hub API    │
│                 │                   │                 │             │                 │
│ Client Cert ────┤                   │ CA Cert ────────┤             │ Certificate ────┤
│ Client Key      │                   │ Server Cert     │             │ Management      │
│ CA Cert         │                   │ Server Key      │             │ Service         │
└─────────────────┘                   └─────────────────┘             └─────────────────┘
```

## 🔐 PKI Инфраструктура

### Компоненты сертификатов:

1. **CA (Certificate Authority)**

   - Корневой сертификат для подписи клиентских и серверных сертификатов
   - Генерируется автоматически IoT Hub backend при первом запуске
   - Срок действия: 10 лет

2. **Server Certificate (EMQX)**

   - Серверный сертификат для EMQX брокера
   - Подписан CA сертификатом
   - Содержит SAN (Subject Alternative Names) для различных хостов
   - Срок действия: 1 год

3. **Client Certificates (Устройства)**
   - Уникальные сертификаты для каждого IoT устройства
   - Подписаны CA сертификатом
   - Содержат device ID в CN (Common Name)
   - Срок действия: 1 год

## 🚀 Быстрый старт

### 1. Подготовка системы

```bash
# Убедитесь, что backend запущен для генерации CA
npm run serve:backend

# В другом терминале проверьте доступность API
curl http://localhost:3000/api/health/logging
```

### 2. Генерация серверных сертификатов для EMQX

```bash
# Генерируем серверные сертификаты
./generate-emqx-certs.sh localhost

# Проверяем созданные файлы
ls -la certs/
```

### 3. Запуск EMQX с mTLS

```bash
# Запускаем EMQX с конфигурацией mTLS
docker-compose -f docker-compose.mtls.yml up -d emqx

# Проверяем логи
docker logs emqx-mtls -f
```

### 4. Генерация сертификата для устройства

```bash
# Создаем сертификат для тестового устройства
./setup-device-mtls.sh test-device test-user

# Запускаем симулятор с mTLS
./start-test-device-mtls.sh
```

## 🔧 Подробная настройка

### Backend Configuration

Добавьте в `.env.development`:

```env
# MQTT Secure Port for mTLS
MQTT_SECURE_PORT=8883

# Certificate storage directory
CERTS_DIR=./certs
```

### EMQX Configuration

Основные настройки в `emqx-mtls.conf`:

```hocon
# SSL Listener
listeners.ssl.default {
  bind = "0.0.0.0:8883"
  ssl_options {
    cacertfile = "/opt/emqx/etc/certs/ca-cert.pem"
    certfile = "/opt/emqx/etc/certs/server-cert.pem"
    keyfile = "/opt/emqx/etc/certs/server-key.pem"
    verify = verify_peer
    fail_if_no_peer_cert = true
  }
}

# HTTP Authentication
authentication = [
  {
    mechanism = http
    method = post
    url = "http://localhost:3000/api/devices/certificates/validate"
  }
]
```

### Device Simulator mTLS

Запуск симулятора с mTLS:

```bash
node device-simulator.js \
  --user-id "test-user" \
  --device-id "test-device" \
  --mqtt-host localhost \
  --mqtt-secure-port 8883 \
  --use-tls true \
  --cert-path "./certs/devices/test-device-cert.pem" \
  --key-path "./certs/devices/test-device-key.pem" \
  --ca-path "./certs/devices/ca-cert.pem"
```

## 📁 Структура сертификатов

```
certs/
├── ca-cert.pem           # CA сертификат (публичный)
├── ca-key.pem            # CA приватный ключ (секретный)
├── server-cert.pem       # EMQX серверный сертификат
├── server-key.pem        # EMQX серверный ключ
└── devices/              # Клиентские сертификаты устройств
    ├── test-device-cert.pem
    ├── test-device-key.pem
    ├── device-001-cert.pem
    ├── device-001-key.pem
    └── ca-cert.pem       # Копия CA для устройств
```

## 🔒 Безопасность

### Права доступа к файлам

```bash
# Приватные ключи - только для чтения владельцем
chmod 600 certs/*-key.pem

# Сертификаты - для чтения всем
chmod 644 certs/*-cert.pem

# Директория сертификатов
chmod 755 certs/
```

### Рекомендации по безопасности

1. **Хранение CA ключа**

   - Храните `ca-key.pem` в безопасном месте
   - Используйте HSM (Hardware Security Module) в продакшене
   - Регулярно создавайте backup'ы

2. **Ротация сертификатов**

   - Настройте автоматическую ротацию сертификатов
   - Мониторьте сроки действия
   - Используйте короткие сроки действия для клиентских сертификатов

3. **Отзыв сертификатов**
   - Ведите список отозванных сертификатов (CRL)
   - Используйте OCSP для проверки статуса
   - Автоматически отзывайте сертификаты скомпрометированных устройств

## 🌐 API Endpoints

### Certificate Management

```http
# Создание сертификата для устройства
POST /api/devices/certificates/:deviceId
Response: {
  "deviceId": "device-001",
  "clientCert": "-----BEGIN CERTIFICATE-----...",
  "clientKey": "-----BEGIN PRIVATE KEY-----...",
  "caCert": "-----BEGIN CERTIFICATE-----...",
  "fingerprint": "AA:BB:CC:DD:EE:FF:...",
  "brokerUrl": "localhost",
  "mqttSecurePort": 8883
}

# Получение информации о сертификате
GET /api/devices/certificates/:deviceId
Response: {
  "id": "uuid",
  "fingerprint": "AA:BB:CC:DD:EE:FF:...",
  "createdAt": "2025-06-15T...",
  "isValid": true
}

# Отзыв сертификата
DELETE /api/devices/certificates/:deviceId
Response: {
  "message": "Сертификат отозван",
  "deviceId": "device-001",
  "revokedAt": "2025-06-15T..."
}

# Валидация сертификата (для EMQX)
POST /api/devices/certificates/validate/:fingerprint
Response: {
  "valid": true,
  "fingerprint": "AA:BB:CC:DD:EE:FF:..."
}

# Получение CA сертификата
GET /api/devices/certificates/ca/certificate
Response: {
  "caCert": "-----BEGIN CERTIFICATE-----..."
}
```

## 🧪 Тестирование

### Проверка подключения

```bash
# Тест подключения с правильными сертификатами
mosquitto_pub \
  --cafile certs/ca-cert.pem \
  --cert certs/devices/test-device-cert.pem \
  --key certs/devices/test-device-key.pem \
  -h localhost -p 8883 \
  -t "users/test-user/devices/test-device/rpc/request" \
  -m '{"id":"test","method":"ping","params":{}}'

# Проверка ответа
mosquitto_sub \
  --cafile certs/ca-cert.pem \
  --cert certs/devices/test-device-cert.pem \
  --key certs/devices/test-device-key.pem \
  -h localhost -p 8883 \
  -t "users/test-user/devices/test-device/rpc/response"
```

### Проверка отказа в доступе

```bash
# Попытка подключения без сертификата (должна провалиться)
mosquitto_pub -h localhost -p 8883 -t "test/topic" -m "test"

# Попытка подключения с неверным сертификатом
mosquitto_pub \
  --cafile /path/to/wrong/ca.pem \
  -h localhost -p 8883 -t "test/topic" -m "test"
```

## 📊 Мониторинг

### EMQX Dashboard

1. Откройте https://localhost:18083
2. Войдите: admin / iot-hub-admin
3. Проверьте:
   - Connections → SSL connections
   - Authentication → HTTP auth stats
   - Certificates → Active certificates

### Логи

```bash
# EMQX логи
docker logs emqx-mtls -f

# Backend логи (certificate service)
npm run serve:backend | grep CertificateService

# SSL handshake логи
docker exec emqx-mtls tail -f /opt/emqx/log/ssl.log
```

## 🛠️ Troubleshooting

### Частые проблемы

1. **Ошибка "certificate verify failed"**

   ```
   Причина: Неправильный CA сертификат или истек срок действия
   Решение: Проверьте CA сертификат и сроки действия
   ```

2. **Ошибка "handshake failure"**

   ```
   Причина: Неправильная конфигурация SSL в EMQX
   Решение: Проверьте пути к сертификатам в конфигурации
   ```

3. **Ошибка "peer verification failed"**

   ```
   Причина: EMQX не может проверить клиентский сертификат
   Решение: Убедитесь, что клиентский сертификат подписан правильным CA
   ```

4. **Устройство не может подключиться**
   ```
   Причина: Сертификат отозван или не найден в базе данных
   Решение: Проверьте статус сертификата через API
   ```

### Отладка

```bash
# Проверка сертификата
openssl x509 -in certs/devices/test-device-cert.pem -text -noout

# Проверка цепочки сертификатов
openssl verify -CAfile certs/ca-cert.pem certs/devices/test-device-cert.pem

# Тест SSL соединения
openssl s_client -connect localhost:8883 \
  -cert certs/devices/test-device-cert.pem \
  -key certs/devices/test-device-key.pem \
  -CAfile certs/ca-cert.pem
```

## 🔄 Автоматизация

### Скрипты автоматизации

1. **setup-device-mtls.sh** - Полная настройка устройства с mTLS
2. **generate-emqx-certs.sh** - Генерация серверных сертификатов
3. **rotate-certificates.sh** - Ротация сертификатов (TODO)
4. **backup-ca.sh** - Backup CA ключей (TODO)

### CI/CD Integration

```yaml
# .github/workflows/mtls-test.yml
name: mTLS Integration Test
on: [push, pull_request]

jobs:
  mtls-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup mTLS environment
        run: |
          ./generate-emqx-certs.sh
          docker-compose -f docker-compose.mtls.yml up -d
      - name: Test device connection
        run: |
          ./setup-device-mtls.sh ci-test-device ci-user
          ./test-mtls-connection.sh
```

## 📈 Production Deployment

### Рекомендации для продакшена

1. **Используйте внешний CA**

   - Интегрируйтесь с корпоративным PKI
   - Используйте HSM для хранения root ключей

2. **Load Balancing**

   - Используйте HAProxy для балансировки mTLS соединений
   - Настройте sticky sessions для MQTT

3. **Мониторинг**

   - Настройте алерты на истечение сертификатов
   - Мониторьте количество отказов аутентификации

4. **Backup & Recovery**
   - Регулярное резервное копирование CA ключей
   - Процедуры восстановления PKI инфраструктуры

Система mTLS аутентификации готова к использованию! 🚀
