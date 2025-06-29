#!/bin/bash

# Скрипт для запуска device-simulator с mTLS
# Использование: ./start-device-simulator-mtls.sh [device-id] [user-id] [backend-url]

set -e

DEVICE_ID=${1:-"test-device-001"}
USER_ID=${2:-"550e8400-e29b-41d4-a716-446655440000"}
BACKEND_URL=${3:-"http://localhost:3000"}
MQTT_HOST=${4:-"localhost"}
MQTT_SECURE_PORT=${5:-"8883"}

echo "🚀 Запуск Device Simulator с mTLS"
echo "   📱 Device ID: $DEVICE_ID"
echo "   👤 User ID: $USER_ID"
echo "   🌐 Backend URL: $BACKEND_URL"
echo "   🔐 MQTT Host: $MQTT_HOST:$MQTT_SECURE_PORT"

# Проверяем, что backend доступен
echo
echo "🔍 Проверка доступности backend..."
if ! curl -f -s "$BACKEND_URL/api/health" > /dev/null; then
  echo "❌ Backend недоступен по адресу: $BACKEND_URL"
  echo "Убедитесь, что backend запущен:"
  echo "   npm run serve:backend"
  exit 1
fi
echo "✅ Backend доступен"

# Проверяем, что EMQX запущен
echo
echo "🔍 Проверка доступности EMQX..."
if ! nc -z "$MQTT_HOST" "$MQTT_SECURE_PORT" 2>/dev/null; then
  echo "❌ EMQX недоступен по адресу: $MQTT_HOST:$MQTT_SECURE_PORT"
  echo "Убедитесь, что EMQX запущен с mTLS:"
  echo "   docker-compose up -d emqx"
  exit 1
fi
echo "✅ EMQX доступен"

# Создаем директорию для сертификатов
CERTS_DIR="./apps/device-simulator/certs"
mkdir -p "$CERTS_DIR"

echo
echo "🔐 Проверка сертификатов устройства..."

# Проверяем, есть ли уже сертификаты для устройства
CERT_FILES=(
  "$CERTS_DIR/${DEVICE_ID}-client-cert.pem"
  "$CERTS_DIR/${DEVICE_ID}-client-key.pem"
  "$CERTS_DIR/${DEVICE_ID}-ca-cert.pem"
)

ALL_CERTS_EXIST=true
for cert_file in "${CERT_FILES[@]}"; do
  if [[ ! -f "$cert_file" ]]; then
    ALL_CERTS_EXIST=false
    break
  fi
done

if [[ "$ALL_CERTS_EXIST" == "true" ]]; then
  echo "✅ Сертификаты для устройства $DEVICE_ID найдены"
  
  # Проверяем срок действия сертификата
  if openssl x509 -in "$CERTS_DIR/${DEVICE_ID}-client-cert.pem" -checkend 86400 -noout > /dev/null; then
    echo "✅ Сертификат действителен"
  else
    echo "⚠️  Сертификат истекает в течение 24 часов или уже истек"
    echo "Рекомендуется обновить сертификат"
  fi
else
  echo "📝 Сертификаты не найдены, device-simulator получит их автоматически при запуске"
fi

echo
echo "🔧 Установка переменных окружения..."

# Экспортируем переменные окружения для device-simulator
export DEVICE_ID="$DEVICE_ID"
export USER_ID="$USER_ID"
export BACKEND_URL="$BACKEND_URL"
export MQTT_HOST="$MQTT_HOST"
export MQTT_SECURE_PORT="$MQTT_SECURE_PORT"
export USE_MTLS="true"
export CERTS_DIR="$CERTS_DIR"
export SENSOR_UPDATE_INTERVAL="60000"  # Интервал обновления сенсоров в миллисекундах

echo "✅ Переменные окружения установлены:"
echo "   DEVICE_ID=$DEVICE_ID"
echo "   USER_ID=$USER_ID"
echo "   BACKEND_URL=$BACKEND_URL"
echo "   MQTT_HOST=$MQTT_HOST"
echo "   MQTT_SECURE_PORT=$MQTT_SECURE_PORT"
echo "   USE_MTLS=$USE_MTLS"
echo "   CERTS_DIR=$CERTS_DIR"

echo
echo "🚀 Запуск Device Simulator..."
echo "Device Simulator автоматически:"
echo "   1. Сгенерирует ключевую пару на криптографическом чипе"
echo "   2. Создаст CSR (Certificate Signing Request)"
echo "   3. Отправит CSR на backend для подписания"
echo "   4. Получит подписанный сертификат"
echo "   5. Подключится к EMQX через mTLS"

echo
echo "📊 Для мониторинга:"
echo "   🌐 EMQX Dashboard: http://localhost:18083 (admin/iot-hub-admin)"
echo "   📱 Device Simulator API: http://localhost:3001/api/simulator"
echo "   🔙 Backend API: $BACKEND_URL/api"

echo
echo "Нажмите Ctrl+C для остановки..."

# Запускаем device-simulator
nx serve device-simulator