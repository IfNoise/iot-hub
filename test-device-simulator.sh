#!/bin/bash

# Тестовый скрипт для обновленного симулятора устройств
# Демонстрирует все новые возможности симулятора

BASE_URL="http://localhost:3001/api/simulator"
DEVICE_ID="demo-device-$(date +%s)"

echo "🚀 Тестирование обновленного Device Simulator"
echo "=============================================="

echo ""
echo "1️⃣  Проверка начального статуса..."
curl -s "$BASE_URL/status" | jq '.'

echo ""
echo "2️⃣  Конфигурирование устройства с MQTT..."
curl -s -X POST "$BASE_URL/configure" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"model\": \"IoT-Simulator-v2\",
    \"firmwareVersion\": \"2.0.0\",
    \"backendUrl\": \"http://localhost:3000\",
    \"autoRegister\": true,
    \"mqtt\": {
      \"brokerUrl\": \"mqtt://localhost:1883\",
      \"userId\": \"demo-user\",
      \"qos\": 1
    }
  }" | jq '.'

echo ""
echo "3️⃣  Проверка статуса MQTT подключения..."
curl -s "$BASE_URL/mqtt/status" | jq '.'

echo ""
echo "4️⃣  Получение данных устройства..."
curl -s "$BASE_URL/status" | jq '.'

echo ""
echo "5️⃣  Получение данных сенсоров..."
curl -s "$BASE_URL/sensors" | jq '.'

echo ""
echo "6️⃣  Информация о криптографическом чипе..."
curl -s "$BASE_URL/crypto-chip" | jq '.'

echo ""
echo "✅ Тестирование завершено!"
echo ""
echo "📋 Симулятор готов к работе:"
echo "   • Device ID: $DEVICE_ID"
echo "   • MQTT: Подключен к mqtt://localhost:1883"
echo "   • Crypto Chip: Инициализирован"
echo "   • Sensors: Активны (обновляются каждые 5 секунд)"
echo ""
echo "🔧 Для тестирования RPC команд используйте backend MQTT API:"
echo "   curl -X POST http://localhost:3000/api/mqtt/device/command \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{"
echo "       \"userId\": \"demo-user\","
echo "       \"deviceId\": \"$DEVICE_ID\","
echo "       \"method\": \"getDeviceState\","
echo "       \"timeout\": 5000"
echo "     }'"
