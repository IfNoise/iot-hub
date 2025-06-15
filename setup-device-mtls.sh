#!/bin/bash

# Скрипт для настройки mTLS сертификатов для симулятора устройства
# Использование: ./setup-device-mtls.sh [device-id] [user-id]

set -e

# Настройки по умолчанию
DEVICE_ID=${1:-test-device}
USER_ID=${2:-test-user}
BACKEND_URL=${3:-http://localhost:3000}
CERTS_DIR="./certs/devices"

echo "🔐 Настройка mTLS для устройства $DEVICE_ID"
echo "   👤 User ID: $USER_ID"
echo "   🌐 Backend URL: $BACKEND_URL"
echo "   📁 Certs Directory: $CERTS_DIR"

# Создаем директорию для сертификатов
mkdir -p "$CERTS_DIR"

echo
echo "📝 Шаг 1: Регистрация устройства в системе..."

# Сначала создаем устройство в системе (если нужно)
curl -s -X POST "$BACKEND_URL/api/devices/sign-device" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"publicKey\": \"dummy-key-for-mtls\",
    \"firmwareVersion\": \"1.0.0\",
    \"model\": \"IoT-Simulator\"
  }" || echo "Устройство уже может быть зарегистрировано"

echo
echo "🔧 Шаг 2: Генерация mTLS сертификата..."

# Генерируем сертификат через API
RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/devices/certificates/$DEVICE_ID" \
  -H "Content-Type: application/json" || {
    echo "❌ Ошибка генерации сертификата!"
    echo "Убедитесь, что backend запущен на $BACKEND_URL"
    exit 1
  })

# Проверяем, что получили ответ
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Ошибка API: $RESPONSE"
  exit 1
fi

echo "✅ Сертификат сгенерирован успешно"

echo
echo "💾 Шаг 3: Сохранение сертификатов..."

# Извлекаем сертификаты из JSON ответа и сохраняем в файлы
echo "$RESPONSE" | jq -r '.clientCert' > "$CERTS_DIR/${DEVICE_ID}-cert.pem"
echo "$RESPONSE" | jq -r '.clientKey' > "$CERTS_DIR/${DEVICE_ID}-key.pem"
echo "$RESPONSE" | jq -r '.caCert' > "$CERTS_DIR/ca-cert.pem"

# Устанавливаем правильные права доступа
chmod 600 "$CERTS_DIR/${DEVICE_ID}-key.pem"
chmod 644 "$CERTS_DIR/${DEVICE_ID}-cert.pem"
chmod 644 "$CERTS_DIR/ca-cert.pem"

echo "📄 Сертификаты сохранены:"
echo "   📜 Client Cert: $CERTS_DIR/${DEVICE_ID}-cert.pem"
echo "   🔑 Client Key:  $CERTS_DIR/${DEVICE_ID}-key.pem"
echo "   🏛️  CA Cert:     $CERTS_DIR/ca-cert.pem"

echo
echo "🚀 Готово! Теперь можно запустить симулятор с mTLS:"
echo
echo "node device-simulator.js \\"
echo "  --user-id \"$USER_ID\" \\"
echo "  --device-id \"$DEVICE_ID\" \\"
echo "  --mqtt-host localhost \\"
echo "  --mqtt-secure-port 8883 \\"
echo "  --use-tls true \\"
echo "  --cert-path \"$CERTS_DIR/${DEVICE_ID}-cert.pem\" \\"
echo "  --key-path \"$CERTS_DIR/${DEVICE_ID}-key.pem\" \\"
echo "  --ca-path \"$CERTS_DIR/ca-cert.pem\""
echo

# Создаем удобный запускающий скрипт
LAUNCHER_SCRIPT="start-$DEVICE_ID-mtls.sh"
cat > "$LAUNCHER_SCRIPT" << EOF
#!/bin/bash
# Автоматически сгенерированный скрипт запуска симулятора с mTLS
# Устройство: $DEVICE_ID

node device-simulator.js \\
  --user-id "$USER_ID" \\
  --device-id "$DEVICE_ID" \\
  --mqtt-host localhost \\
  --mqtt-secure-port 8883 \\
  --use-tls true \\
  --cert-path "$CERTS_DIR/${DEVICE_ID}-cert.pem" \\
  --key-path "$CERTS_DIR/${DEVICE_ID}-key.pem" \\
  --ca-path "$CERTS_DIR/ca-cert.pem"
EOF

chmod +x "$LAUNCHER_SCRIPT"

echo "📄 Создан скрипт запуска: ./$LAUNCHER_SCRIPT"
echo
echo "🎯 Для тестирования mTLS подключения:"
echo "   1. Убедитесь, что EMQX настроен для mTLS на порту 8883"
echo "   2. Запустите: ./$LAUNCHER_SCRIPT"
echo
echo "✨ Настройка завершена!"
