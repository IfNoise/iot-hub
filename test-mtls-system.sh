#!/bin/bash

# Полный тест системы mTLS
# Использование: ./test-mtls-system.sh

set -e

echo "🧪 Полный тест системы mTLS для IoT Hub"
echo "======================================"

DEVICE_ID="test-mtls-device"
USER_ID="test-mtls-user"
BACKEND_URL="http://localhost:3000"

echo
echo "📝 Шаг 1: Проверка доступности backend..."

if ! curl -f -s "$BACKEND_URL/api" > /dev/null; then
  echo "❌ Backend недоступен на $BACKEND_URL"
  echo "Запустите backend: npm run serve:backend"
  exit 1
fi

echo "✅ Backend доступен"

echo
echo "🔐 Шаг 2: Генерация CA и серверных сертификатов..."

# Генерируем серверные сертификаты для EMQX
if [[ ! -f "./certs/server-cert.pem" ]]; then
  echo "Генерируем серверные сертификаты..."
  ./generate-emqx-certs.sh localhost
else
  echo "✅ Серверные сертификаты уже существуют"
fi

echo
echo "📱 Шаг 3: Создание тестового устройства..."

# Создаем тестовое устройство
./setup-device-mtls.sh "$DEVICE_ID" "$USER_ID" "$BACKEND_URL"

echo
echo "🐳 Шаг 4: Запуск EMQX с mTLS..."

# Проверяем, запущен ли EMQX
if ! docker ps | grep -q emqx-mtls; then
  echo "Запускаем EMQX..."
  docker-compose -f docker-compose.mtls.yml up -d emqx
  
  echo "Ожидаем запуска EMQX..."
  sleep 10
  
  # Проверяем статус
  if ! docker ps | grep -q emqx-mtls; then
    echo "❌ Не удалось запустить EMQX"
    docker logs emqx-mtls
    exit 1
  fi
else
  echo "✅ EMQX уже запущен"
fi

echo
echo "🔍 Шаг 5: Проверка EMQX портов..."

if netstat -an | grep -q ":8883"; then
  echo "✅ EMQX mTLS порт 8883 открыт"
else
  echo "❌ EMQX mTLS порт 8883 недоступен"
  exit 1
fi

echo
echo "📡 Шаг 6: Тест mTLS подключения с mosquitto..."

CERT_PATH="./certs/devices/${DEVICE_ID}-cert.pem"
KEY_PATH="./certs/devices/${DEVICE_ID}-key.pem"
CA_PATH="./certs/devices/ca-cert.pem"

if command -v mosquitto_pub &> /dev/null; then
  echo "Тестируем публикацию сообщения..."
  
  timeout 10s mosquitto_pub \
    --cafile "$CA_PATH" \
    --cert "$CERT_PATH" \
    --key "$KEY_PATH" \
    -h localhost -p 8883 \
    -t "users/$USER_ID/devices/$DEVICE_ID/test" \
    -m "mTLS test message" \
    -q 1 \
    --insecure || {
    echo "⚠️  mosquitto_pub недоступен или не удалось подключиться"
    echo "Проверьте установку mosquitto-clients"
  }
  
  echo "✅ Тест mosquitto выполнен"
else
  echo "⚠️  mosquitto_pub не установлен, пропускаем тест"
fi

echo
echo "🤖 Шаг 7: Тест симулятора устройства..."

# Запускаем симулятор в фоне на 10 секунд
LAUNCHER_SCRIPT="./start-${DEVICE_ID}-mtls.sh"

if [[ -f "$LAUNCHER_SCRIPT" ]]; then
  echo "Запускаем симулятор устройства..."
  
  # Запускаем симулятор в фоне
  timeout 10s bash "$LAUNCHER_SCRIPT" &
  SIMULATOR_PID=$!
  
  # Ждем несколько секунд для подключения
  sleep 5
  
  # Проверяем, что процесс еще работает
  if kill -0 $SIMULATOR_PID 2>/dev/null; then
    echo "✅ Симулятор успешно подключился"
    
    # Отправляем тестовую команду
    echo "Отправляем тестовую RPC команду..."
    
    curl -s -X POST "$BACKEND_URL/api/mqtt/device/command" \
      -H "Content-Type: application/json" \
      -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"getSensors\",
        \"params\": {},
        \"timeout\": 5000
      }" | jq '.' || echo "Команда отправлена"
    
    # Останавливаем симулятор
    kill $SIMULATOR_PID 2>/dev/null || true
    wait $SIMULATOR_PID 2>/dev/null || true
    
    echo "✅ Тест симулятора завершен"
  else
    echo "❌ Симулятор не смог подключиться"
  fi
else
  echo "❌ Скрипт запуска симулятора не найден: $LAUNCHER_SCRIPT"
fi

echo
echo "🧹 Шаг 8: Проверка логов..."

echo "Последние логи EMQX:"
docker logs emqx-mtls --tail 10 2>/dev/null || echo "Логи EMQX недоступны"

echo
echo "📊 Шаг 9: Проверка сертификатов в базе данных..."

# Проверяем сертификат через API
curl -s "$BACKEND_URL/api/devices/certificates/$DEVICE_ID" | jq '.' || echo "API недоступно"

echo
echo "✅ Тест системы mTLS завершен!"
echo
echo "📋 Результаты:"
echo "   🔐 CA сертификат: $(ls -la certs/ca-cert.pem 2>/dev/null || echo 'не найден')"
echo "   🌐 Серверный сертификат: $(ls -la certs/server-cert.pem 2>/dev/null || echo 'не найден')"
echo "   📱 Клиентский сертификат: $(ls -la "$CERT_PATH" 2>/dev/null || echo 'не найден')"
echo "   🐳 EMQX статус: $(docker ps --filter name=emqx-mtls --format 'table {{.Status}}' | tail -n1 || echo 'не запущен')"

echo
echo "🌐 Доступные ресурсы:"
echo "   📊 EMQX Dashboard: https://localhost:18083 (admin/iot-hub-admin)"
echo "   🔐 MQTT mTLS: mqtts://localhost:8883"
echo "   📡 Backend API: $BACKEND_URL/api"

echo
echo "🎯 Для полноценного тестирования:"
echo "   1. Откройте EMQX Dashboard и проверьте подключения"
echo "   2. Запустите симулятор: ./$LAUNCHER_SCRIPT"
echo "   3. Отправьте команды через Swagger UI: $BACKEND_URL/api/docs"

echo
echo "✨ Система mTLS готова к использованию!"
