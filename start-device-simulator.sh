#!/bin/bash

# start-device-simulator.sh
# Быстрый запуск симулятора устройства с предустановленными параметрами

echo "🚀 Запуск IoT Device Simulator"
echo "============================="

# Параметры по умолчанию
USER_ID="${1:-test-user}"
DEVICE_ID="${2:-test-device-$(date +%s)}"
MQTT_HOST="${3:-localhost}"
MQTT_PORT="${4:-1883}"

echo "👤 User ID: $USER_ID"
echo "📱 Device ID: $DEVICE_ID"
echo "📡 MQTT Broker: $MQTT_HOST:$MQTT_PORT"
echo ""

echo "🎯 Запуск симулятора... (Ctrl+C для остановки)"
echo "================================================"

# Запуск симулятора
node device-simulator.js \
    --user-id "$USER_ID" \
    --device-id "$DEVICE_ID" \
    --mqtt-host "$MQTT_HOST" \
    --mqtt-port "$MQTT_PORT"
