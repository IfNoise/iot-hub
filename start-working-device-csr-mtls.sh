#!/bin/bash
# Автоматически сгенерированный скрипт запуска симулятора с mTLS (CSR flow)
# Устройство: working-device

echo "🚀 Запуск IoT симулятора с mTLS (CSR flow)"
echo "   📱 Device: working-device"
echo "   👤 User: test-user"
echo "   🔐 mTLS: включен"

node device-simulator.js \
  --user-id "test-user" \
  --device-id "working-device" \
  --mqtt-host localhost \
  --mqtt-secure-port 8883 \
  --use-tls true \
  --cert-path "./certs/devices/working-device-cert.pem" \
  --key-path "./certs/devices/working-device-key.pem" \
  --ca-path "./certs/devices/ca-cert.pem"
