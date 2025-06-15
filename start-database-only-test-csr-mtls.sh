#!/bin/bash
# Автоматически сгенерированный скрипт запуска симулятора с mTLS (CSR flow)
# Устройство: database-only-test

echo "🚀 Запуск IoT симулятора с mTLS (CSR flow)"
echo "   📱 Device: database-only-test"
echo "   👤 User: test-user"
echo "   🔐 mTLS: включен"

node device-simulator.js \
  --user-id "test-user" \
  --device-id "database-only-test" \
  --mqtt-host localhost \
  --mqtt-secure-port 8883 \
  --use-tls true \
  --cert-path "./certs/devices/database-only-test-cert.pem" \
  --key-path "./certs/devices/database-only-test-key.pem" \
  --ca-path "./certs/devices/ca-cert.pem"
