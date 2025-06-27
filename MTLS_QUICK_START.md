# 🔐 mTLS Quick Start Guide

Быстрое руководство по запуску IoT Hub с mTLS аутентификацией для устройств.

## 🎯 Что настроено

После выполнения настройки mTLS в вашей системе работает:

1. **Backend с CA сертификатом** - автоматически генерирует корневой сертификат
2. **EMQX с mTLS** - настроен для взаимной TLS аутентификации устройств
3. **Device Simulator** - автоматически получает сертификаты через CSR процесс
4. **Автоматические скрипты** - для простого запуска и тестирования

## 🚀 Быстрый запуск

### Вариант 1: Автоматический запуск всей системы

```bash
# Запускает backend, EMQX и подготавливает сертификаты
./start-iot-hub-mtls.sh
```

Этот скрипт:

- Запускает backend (генерирует CA сертификат)
- Генерирует серверные сертификаты для EMQX
- Запускает EMQX с mTLS конфигурацией
- Выводит инструкции для запуска device-simulator

### Вариант 2: Пошаговый запуск

```bash
# 1. Запуск backend
npm run serve:backend

# 2. Генерация серверных сертификатов (в другом терминале)
./generate-emqx-certs.sh localhost

# 3. Запуск EMQX с mTLS
docker-compose up -d emqx

# 4. Запуск device-simulator с автоматическим получением сертификатов
./start-device-simulator-mtls.sh
```

## 🧪 Тестирование настройки

Проверьте, что все компоненты работают корректно:

```bash
# Полное тестирование mTLS настройки
./test-mtls-setup.sh
```

Тест проверяет:

- ✅ Доступность backend API
- ✅ Работу EMQX с mTLS
- ✅ Валидность сертификатов
- ✅ CSR процесс подписания
- ✅ TLS handshake с EMQX

## 📊 Мониторинг

### EMQX Dashboard

```
URL: http://localhost:18083
Логин: admin
Пароль: iot-hub-admin
```

Разделы для мониторинга:

- **Clients** - активные устройства с mTLS
- **Subscriptions** - подписки устройств
- **Authentication** - статистика аутентификации

### Device Simulator API

```
URL: http://localhost:3001/api/simulator
Endpoints:
- GET /simulator/status - статус устройства
- POST /simulator/auto-configure - автоконфигурация из env
- GET /simulator/certificates - информация о сертификатах
```

### Backend API

```
URL: http://localhost:3000/api
Endpoints:
- GET /devices/certificates/ca - CA сертификат
- POST /devices/certificates/{deviceId}/sign-csr - подписание CSR
- GET /devices/certificates/{deviceId} - информация о сертификате
```

## 🔐 Архитектура mTLS

```
┌─────────────────┐    CSR      ┌─────────────────┐    mTLS     ┌─────────────────┐
│   IoT Device    │─────────────►│   Backend       │◄────────────│   EMQX Broker   │
│                 │              │                 │             │                 │
│ 1. Gen KeyPair  │              │ 3. Sign CSR     │             │ 5. Verify       │
│ 2. Create CSR   │              │ 4. Return Cert  │             │    Client Cert  │
│                 │              │                 │             │                 │
└─────────────────┘              └─────────────────┘             └─────────────────┘
```

### Процесс получения сертификата:

1. **Device Simulator** генерирует ключевую пару на "криптографическом чипе"
2. Создает **CSR** (Certificate Signing Request) с публичным ключом
3. Отправляет CSR на **Backend** для подписания
4. **Backend** подписывает CSR своим CA сертификатом
5. **Device Simulator** получает подписанный сертификат
6. Подключается к **EMQX** через mTLS с полученным сертификатом

## 📁 Структура сертификатов

```
apps/backend/certs/              # Серверные сертификаты
├── ca-cert.pem                  # CA сертификат (публичный)
├── ca-key.pem                   # CA ключ (приватный)
├── server-cert.pem              # EMQX серверный сертификат
└── server-key.pem               # EMQX серверный ключ

apps/device-simulator/certs/     # Клиентские сертификаты устройств
├── {device-id}-ca-cert.pem      # CA сертификат для устройства
├── {device-id}-client-cert.pem  # Клиентский сертификат
└── {device-id}-client-key.pem   # Клиентский ключ (из crypto chip)
```

## ⚙️ Конфигурация

### Переменные окружения Device Simulator

Создайте `.env` файл в `apps/device-simulator/`:

```bash
# Основные настройки
DEVICE_ID=my-device-001
USER_ID=my-user
BACKEND_URL=http://localhost:3000

# mTLS настройки
USE_MTLS=true
MQTT_HOST=localhost
MQTT_SECURE_PORT=8883
AUTO_OBTAIN_CERTIFICATES=true
CERTS_DIR=./certs/devices

# Опциональные настройки
FIRMWARE_VERSION=1.0.0
DEVICE_MODEL=IoT-Simulator-v1
MQTT_QOS=1
```

### EMQX конфигурация

Файл `emqx-mtls.conf` уже настроен для:

- mTLS на порту 8883
- HTTP аутентификация через backend
- Проверка клиентских сертификатов
- Логирование для отладки

## 🔧 Кастомизация

### Изменение имени хоста для сертификатов

```bash
# Для доступа по IP или другому имени хоста
./generate-emqx-certs.sh your-hostname-or-ip
```

### Настройка device-simulator для продакшена

```bash
# Настройка переменных окружения
export DEVICE_ID="production-device-001"
export BACKEND_URL="https://your-backend.com"
export MQTT_HOST="your-mqtt-broker.com"
export TLS_REJECT_UNAUTHORIZED=true

# Запуск с кастомными настройками
./start-device-simulator-mtls.sh
```

## 🐛 Отладка

### Проблемы с сертификатами

```bash
# Проверка CA сертификата
openssl x509 -in apps/backend/certs/ca-cert.pem -text -noout

# Проверка серверного сертификата
openssl x509 -in apps/backend/certs/server-cert.pem -text -noout

# Проверка соответствия ключа и сертификата
openssl x509 -modulus -noout -in apps/backend/certs/server-cert.pem | openssl md5
openssl rsa -modulus -noout -in apps/backend/certs/server-key.pem | openssl md5
```

### Логи EMQX

```bash
# Просмотр логов EMQX
docker-compose logs -f emqx

# Детальные логи mTLS
docker exec emqx-mtls tail -f /opt/emqx/log/emqx.log
```

### Тестирование подключения

```bash
# Тест TLS handshake
openssl s_client -connect localhost:8883 \
  -CAfile apps/backend/certs/ca-cert.pem \
  -cert apps/device-simulator/certs/test-device-001-client-cert.pem \
  -key apps/device-simulator/certs/test-device-001-client-key.pem

# Тест MQTT с mosquitto (если установлен)
mosquitto_pub -h localhost -p 8883 \
  --cafile apps/backend/certs/ca-cert.pem \
  --cert apps/device-simulator/certs/test-device-001-client-cert.pem \
  --key apps/device-simulator/certs/test-device-001-client-key.pem \
  -t "test/status" -m "Hello mTLS!"
```

## 🔒 Безопасность

### Рекомендации для продакшена

1. **Храните CA ключ в безопасном месте**

   ```bash
   chmod 600 apps/backend/certs/ca-key.pem
   chown root:root apps/backend/certs/ca-key.pem
   ```

2. **Используйте HSM для CA ключа**
3. **Настройте ротацию сертификатов**
4. **Мониторьте сроки действия сертификатов**
5. **Ведите список отозванных сертификатов (CRL)**

## 📚 Дополнительная документация

- [Полная документация mTLS](./docs/MTLS_SETUP.md)
- [CSR процесс](./docs/MTLS_CSR_SETUP.md)
- [API документация](./docs/API_DOCUMENTATION.md)
- [Конфигурация EMQX](./docs/INFRASTRUCTURE.md)

---

**Система готова к работе с mTLS! 🎉**

Для поддержки: проверьте логи сервисов или запустите `./test-mtls-setup.sh` для диагностики.
