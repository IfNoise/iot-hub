#!/bin/bash

# Скрипт для настройки mTLS с использованием CSR (правильный PKI флоу)
# Использование: ./setup-device-csr-mtls.sh [device-id] [user-id]

set -e

# Настройки по умолчанию
DEVICE_ID=${1:-test-device}
USER_ID=${2:-test-user}
BACKEND_URL=${3:-http://localhost:3000}
CERTS_DIR="./certs/devices"

echo "🔐 Настройка mTLS с CSR для устройства $DEVICE_ID"
echo "   👤 User ID: $USER_ID"
echo "   🌐 Backend URL: $BACKEND_URL"
echo "   📁 Certs Directory: $CERTS_DIR"

# Создаем директорию для сертификатов
mkdir -p "$CERTS_DIR"

echo
echo "📝 Шаг 1: Проверка доступности backend..."

if ! curl -f -s "$BACKEND_URL/api" > /dev/null; then
  echo "❌ Backend недоступен на $BACKEND_URL"
  echo "Запустите backend: npm run serve:backend"
  exit 1
fi

echo "✅ Backend доступен"

echo
echo "🔧 Шаг 2: Регистрация устройства в системе..."

# Проверяем, существует ли устройство
DEVICE_CHECK=$(curl -s "$BACKEND_URL/api/devices" -H "Accept: application/json" || echo '{"devices":[]}')

if echo "$DEVICE_CHECK" | jq -e ".devices[] | select(.id == \"$DEVICE_ID\")" > /dev/null 2>&1; then
  echo "✅ Устройство $DEVICE_ID уже существует в системе"
else
  echo "Создаем новое устройство $DEVICE_ID..."
  
  # Создаем устройство БЕЗ CSR (только регистрация)
  curl -s -X POST "$BACKEND_URL/api/devices/sign-device" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$DEVICE_ID\",
      \"publicKey\": \"temporary-public-key-placeholder\",
      \"firmwareVersion\": \"1.0.0\",
      \"model\": \"IoT-Simulator-CSR\"
    }" > /dev/null || echo "Не удалось создать устройство"
  
  echo "✅ Устройство зарегистрировано (сертификат будет создан через CSR)"
fi

echo
echo "🔑 Шаг 3: Генерация приватного ключа устройства (симуляция криптографического чипа)..."

DEVICE_KEY_PATH="$CERTS_DIR/${DEVICE_ID}-key.pem"
DEVICE_CSR_PATH="$CERTS_DIR/${DEVICE_ID}.csr"

# Генерируем приватный ключ (в реальности это делает криптографический чип)
openssl genrsa -out "$DEVICE_KEY_PATH" 2048
chmod 600 "$DEVICE_KEY_PATH"

echo "✅ Приватный ключ создан: $DEVICE_KEY_PATH"

echo
echo "📋 Шаг 4: Создание Certificate Signing Request (CSR)..."

# Создаем конфигурационный файл для CSR
cat > "$CERTS_DIR/${DEVICE_ID}.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = IoT Hub
OU = Device
CN = device-${DEVICE_ID}

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = device-${DEVICE_ID}.iot-hub.local
DNS.2 = ${DEVICE_ID}
EOF

# Создаем CSR
openssl req -new -key "$DEVICE_KEY_PATH" \
  -out "$DEVICE_CSR_PATH" \
  -config "$CERTS_DIR/${DEVICE_ID}.conf"

echo "✅ CSR создан: $DEVICE_CSR_PATH"

echo
echo "🔐 Шаг 5: Отправка CSR на подписание в backend..."

# Читаем CSR и правильно экранируем для JSON
CSR_CONTENT=$(cat "$DEVICE_CSR_PATH")

# Создаем JSON с помощью jq для правильного экранирования
JSON_PAYLOAD=$(jq -n \
  --arg csr "$CSR_CONTENT" \
  --arg firmware "1.0.0" \
  --arg hardware "v2.1" \
  '{
    csrPem: $csr,
    firmwareVersion: $firmware,
    hardwareVersion: $hardware
  }')

echo "📤 Отправляем CSR..."

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/devices/certificates/$DEVICE_ID/sign-csr" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" || {
    echo "❌ Ошибка подписания CSR!"
    echo "Убедитесь, что backend запущен на $BACKEND_URL"
    exit 1
  })

# Проверяем, что получили ответ
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Ошибка API: $RESPONSE"
  exit 1
fi

echo "✅ CSR успешно подписан"

echo
echo "💾 Шаг 6: Сохранение подписанного сертификата..."

# Извлекаем сертификаты из JSON ответа и сохраняем в файлы
echo "$RESPONSE" | jq -r '.clientCert' > "$CERTS_DIR/${DEVICE_ID}-cert.pem"
echo "$RESPONSE" | jq -r '.caCert' > "$CERTS_DIR/ca-cert.pem"

# Устанавливаем правильные права доступа
chmod 644 "$CERTS_DIR/${DEVICE_ID}-cert.pem"
chmod 644 "$CERTS_DIR/ca-cert.pem"

echo "📄 Сертификаты сохранены:"
echo "   📜 Client Cert: $CERTS_DIR/${DEVICE_ID}-cert.pem"
echo "   🔑 Client Key:  $DEVICE_KEY_PATH"
echo "   🏛️  CA Cert:     $CERTS_DIR/ca-cert.pem"

# Извлекаем информацию о сертификате
FINGERPRINT=$(echo "$RESPONSE" | jq -r '.fingerprint')
SERIAL_NUMBER=$(echo "$RESPONSE" | jq -r '.serialNumber')
VALID_FROM=$(echo "$RESPONSE" | jq -r '.validFrom')
VALID_TO=$(echo "$RESPONSE" | jq -r '.validTo')

echo
echo "📊 Информация о сертификате:"
echo "   🔍 Fingerprint: $FINGERPRINT"
echo "   🔢 Serial Number: $SERIAL_NUMBER"
echo "   📅 Valid From: $VALID_FROM"
echo "   📅 Valid To: $VALID_TO"

echo
echo "🧹 Шаг 7: Очистка временных файлов..."

# Удаляем временные файлы
rm -f "$DEVICE_CSR_PATH" "$CERTS_DIR/${DEVICE_ID}.conf"

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
echo "  --key-path \"$DEVICE_KEY_PATH\" \\"
echo "  --ca-path \"$CERTS_DIR/ca-cert.pem\""
echo

# Создаем удобный запускающий скрипт
LAUNCHER_SCRIPT="start-$DEVICE_ID-csr-mtls.sh"
cat > "$LAUNCHER_SCRIPT" << EOF
#!/bin/bash
# Автоматически сгенерированный скрипт запуска симулятора с mTLS (CSR flow)
# Устройство: $DEVICE_ID

echo "🚀 Запуск IoT симулятора с mTLS (CSR flow)"
echo "   📱 Device: $DEVICE_ID"
echo "   👤 User: $USER_ID"
echo "   🔐 mTLS: включен"

node device-simulator.js \\
  --user-id "$USER_ID" \\
  --device-id "$DEVICE_ID" \\
  --mqtt-host localhost \\
  --mqtt-secure-port 8883 \\
  --use-tls true \\
  --cert-path "$CERTS_DIR/${DEVICE_ID}-cert.pem" \\
  --key-path "$DEVICE_KEY_PATH" \\
  --ca-path "$CERTS_DIR/ca-cert.pem"
EOF

chmod +x "$LAUNCHER_SCRIPT"

echo "📄 Создан скрипт запуска: ./$LAUNCHER_SCRIPT"
echo
echo "🎯 Для тестирования mTLS подключения:"
echo "   1. Убедитесь, что EMQX настроен для mTLS на порту 8883"
echo "   2. Запустите: ./$LAUNCHER_SCRIPT"
echo
echo "🔍 Проверка сертификата:"
echo "   openssl x509 -in $CERTS_DIR/${DEVICE_ID}-cert.pem -text -noout"
echo
echo "🌐 Отправка тестовой команды:"
echo "   curl -X POST $BACKEND_URL/api/mqtt/device/command \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"$USER_ID\",\"deviceId\":\"$DEVICE_ID\",\"method\":\"getDeviceState\",\"params\":{}}'"
echo
echo "✨ Настройка CSR mTLS завершена!"
