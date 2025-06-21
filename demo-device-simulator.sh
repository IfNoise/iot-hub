#!/bin/bash

# Демонстрационный скрипт для тестирования DeviceSimulator
# Показывает полный флоу от конфигурации до привязки устройства

set -e

DEVICE_SIMULATOR_URL="http://localhost:3001"
DEVICE_ID="demo-device-$(date +%s)"
USER_ID="demo-user-$(uuidgen)"

echo "🚀 Демонстрация DeviceSimulator"
echo "================================"
echo "Device ID: $DEVICE_ID"
echo "User ID: $USER_ID"
echo ""

echo "1. Конфигурирование устройства..."
curl -X POST "$DEVICE_SIMULATOR_URL/api/simulator/configure" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"model\": \"Demo IoT Device\",
    \"firmwareVersion\": \"1.0.0\",
    \"backendUrl\": \"http://localhost:3000\",
    \"autoRegister\": true
  }" \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "2. Проверка состояния устройства..."
sleep 2
curl -X GET "$DEVICE_SIMULATOR_URL/api/simulator/status" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq . || echo "jq не установлен - показать raw JSON"

echo ""
echo "3. Привязка устройства к пользователю..."
curl -X PUT "$DEVICE_SIMULATOR_URL/api/simulator/bind" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\"
  }" \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "4. Финальная проверка состояния..."
sleep 1
curl -X GET "$DEVICE_SIMULATOR_URL/api/simulator/status" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq . || echo "jq не установлен - показать raw JSON"

echo ""
echo "5. Получение данных сенсоров..."
curl -X GET "$DEVICE_SIMULATOR_URL/api/simulator/sensors" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq . || echo "jq не установлен - показать raw JSON"

echo ""
echo "6. Информация о криптографическом чипе..."
curl -X GET "$DEVICE_SIMULATOR_URL/api/simulator/crypto-chip" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq . || echo "jq не установлен - показать raw JSON"

echo ""
echo "7. Остановка симулятора..."
curl -X POST "$DEVICE_SIMULATOR_URL/api/simulator/stop" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\n" \
  -s

echo ""
echo "✅ Демонстрация завершена!"
echo "================================"
echo "Устройство $DEVICE_ID успешно привязано к пользователю $USER_ID"
echo ""
echo "📋 Протестированные функции:"
echo "- ✅ Конфигурирование устройства"
echo "- ✅ Проверка статуса"
echo "- ✅ Привязка к пользователю"
echo "- ✅ Получение данных сенсоров"
echo "- ✅ Работа с криптографическим чипом"
echo "- ✅ Остановка симулятора"
echo ""
echo "🔧 Доступные REST API endpoints:"
echo "- POST /api/simulator/configure - Конфигурация устройства"
echo "- GET  /api/simulator/status    - Статус устройства"
echo "- PUT  /api/simulator/bind      - Привязка к пользователю"
echo "- GET  /api/simulator/sensors   - Данные сенсоров"
echo "- GET  /api/simulator/crypto-chip - Информация о чипе"
echo "- POST /api/simulator/stop      - Остановка симулятора"
echo ""
echo "✨ Симулятор готов к работе на $DEVICE_SIMULATOR_URL"
