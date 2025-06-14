#!/bin/bash

# Пример использования MQTT RPC API
# Убедитесь, что сервер запущен на localhost:3000

BASE_URL="http://localhost:3000/api/mqtt"
USER_ID="test-user"
DEVICE_ID="test-device"

echo "🚀 Тестирование MQTT RPC API"
echo "================================"

# 1. Проверка статуса MQTT подключения
echo "📡 Проверка статуса MQTT подключения..."
curl -s -X POST "$BASE_URL/status" \
  -H "Content-Type: application/json" | jq .

echo -e "\n"

# 2. Получение состояния устройства
echo "🔍 Получение состояния устройства..."
curl -s -X POST "$BASE_URL/device/command" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"method\": \"getDeviceState\",
    \"params\": {},
    \"timeout\": 5000
  }" | jq .

echo -e "\n"

# 3. Получение данных сенсоров
echo "📊 Получение данных сенсоров..."
curl -s -X POST "$BASE_URL/device/command" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"method\": \"getSensors\",
    \"timeout\": 3000
  }" | jq .

echo -e "\n"

# 4. Отправка команды без ожидания ответа
echo "📤 Отправка команды без ожидания ответа..."
curl -s -X POST "$BASE_URL/device/command/no-response" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"method\": \"reboot\"
  }" | jq .

echo -e "\n"

# 5. Обновление дискретного таймера
echo "⏰ Обновление дискретного таймера..."
curl -s -X POST "$BASE_URL/device/command" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceId\": \"$DEVICE_ID\",
    \"method\": \"updateDiscreteTimer\",
    \"params\": {
      \"id\": \"timer1\",
      \"enabled\": true,
      \"schedule\": \"0 6 * * *\",
      \"duration\": 3600,
      \"outputPin\": 12
    },
    \"timeout\": 5000
  }" | jq .

echo -e "\n✅ Тестирование завершено!"
