# 🔐 mTLS Quick Start Guide

Быстрое руководство по настройке и использованию mTLS аутентификации для IoT устройств.

## 🚀 Быстрый запуск

### 1. Запуск backend

```bash
# Установка зависимостей
npm install

# Запуск backend
npm run serve:backend
```

### 2. Полная настройка mTLS

```bash
# Автоматическая настройка всей системы
./test-mtls-system.sh
```

Этот скрипт автоматически:

- ✅ Создает CA сертификат
- ✅ Генерирует серверные сертификаты для EMQX
- ✅ Создает тестовое устройство с клиентским сертификатом
- ✅ Запускает EMQX с mTLS
- ✅ Тестирует подключение

### 3. Создание нового устройства

```bash
# Создание устройства с mTLS сертификатом
./setup-device-mtls.sh my-device my-user

# Запуск симулятора устройства
./start-my-device-mtls.sh
```

## 📱 Использование API

### Создание сертификата

```bash
curl -X POST http://localhost:3000/api/devices/certificates/my-device \
  -H "Content-Type: application/json"
```

### Отправка команды устройству

```bash
curl -X POST http://localhost:3000/api/mqtt/device/command \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "my-user",
    "deviceId": "my-device",
    "method": "getDeviceState",
    "params": {},
    "timeout": 5000
  }'
```

## 🌐 Web интерфейсы

- **EMQX Dashboard**: https://localhost:18083 (admin/iot-hub-admin)
- **Backend API**: http://localhost:3000/api
- **Swagger UI**: http://localhost:3000/api/docs (если настроен)

## 📁 Структура файлов

```
certs/
├── ca-cert.pem           # CA сертификат
├── ca-key.pem            # CA приватный ключ
├── server-cert.pem       # EMQX серверный сертификат
├── server-key.pem        # EMQX серверный ключ
└── devices/              # Сертификаты устройств
    ├── my-device-cert.pem
    ├── my-device-key.pem
    └── ca-cert.pem
```

## 🛠️ Ручная настройка

### 1. Генерация серверных сертификатов

```bash
./generate-emqx-certs.sh localhost
```

### 2. Запуск EMQX

```bash
docker-compose -f docker-compose.mtls.yml up -d emqx
```

### 3. Создание устройства

```bash
# Регистрация устройства
curl -X POST http://localhost:3000/api/devices/sign-device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "my-device",
    "publicKey": "dummy-key",
    "firmwareVersion": "1.0.0",
    "model": "IoT-Device"
  }'

# Генерация сертификата
curl -X POST http://localhost:3000/api/devices/certificates/my-device
```

### 4. Запуск симулятора с mTLS

```bash
node device-simulator.js \
  --user-id "my-user" \
  --device-id "my-device" \
  --mqtt-host localhost \
  --mqtt-secure-port 8883 \
  --use-tls true \
  --cert-path "./certs/devices/my-device-cert.pem" \
  --key-path "./certs/devices/my-device-key.pem" \
  --ca-path "./certs/devices/ca-cert.pem"
```

## 🔍 Отладка

### Проверка сертификатов

```bash
# Проверка клиентского сертификата
openssl x509 -in certs/devices/my-device-cert.pem -text -noout

# Проверка цепочки сертификатов
openssl verify -CAfile certs/ca-cert.pem certs/devices/my-device-cert.pem
```

### Проверка MQTT подключения

```bash
# Тест с mosquitto
mosquitto_pub \
  --cafile certs/ca-cert.pem \
  --cert certs/devices/my-device-cert.pem \
  --key certs/devices/my-device-key.pem \
  -h localhost -p 8883 \
  -t "test/topic" \
  -m "test message"
```

### Логи

```bash
# EMQX логи
docker logs emqx-mtls -f

# Backend логи
npm run serve:backend | grep Certificate
```

## ❗ Troubleshooting

| Проблема                    | Решение                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `certificate verify failed` | Проверьте CA сертификат и сроки действия                    |
| `handshake failure`         | Проверьте конфигурацию SSL в EMQX                           |
| `peer verification failed`  | Убедитесь, что клиентский сертификат подписан правильным CA |
| `connection refused`        | Проверьте, что EMQX запущен на порту 8883                   |

## 📚 Дополнительная документация

- [Полное руководство по mTLS](./docs/MTLS_SETUP.md)
- [Конфигурация EMQX](./emqx-mtls.conf)
- [Docker Compose для mTLS](./docker-compose.mtls.yml)

---

**🎯 Готово!** Ваша система mTLS настроена и готова к использованию!
