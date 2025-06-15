#!/bin/bash
# Автоматически сгенерированный скрипт запуска симулятора с mTLS (CSR flow)
# Устройство: test-device

echo "🚀 Запуск IoT симулятора с mTLS (CSR flow)"
echo "   📱 Device: test-device"
echo "   👤 User: test-user"
echo "   🔐 mTLS: включен"

node device-simulator.js \
  --user-id "test-user" \
  --device-id "test-device" \
  --mqtt-host localhost \
  --mqtt-secure-port 8883 \
  --use-tls true \
  --cert-path "./certs/devices/test-device-cert.pem" \
  --key-path "./certs/devices/test-device-key.pem" \
  --ca-path "./certs/devices/ca-cert.pem"
