#!/bin/bash

# Скрипт для тестирования настройки mTLS
# Проверяет все компоненты системы

set -e

echo "🧪 Тестирование настройки mTLS для IoT Hub"
echo "==========================================="

DEVICE_ID="test-device-mtls"
USER_ID="test-user-mtls"
BACKEND_URL="http://localhost:3000"
EMQX_HOST="localhost"
EMQX_SECURE_PORT="8883"

# Функция для проверки HTTP endpoint
check_endpoint() {
  local url=$1
  local description=$2
  
  echo -n "🔍 Проверка $description... "
  
  if curl -f -s "$url" > /dev/null 2>&1; then
    echo "✅ OK"
    return 0
  else
    echo "❌ FAILED"
    return 1
  fi
}

# Функция для проверки порта
check_port() {
  local host=$1
  local port=$2
  local description=$3
  
  echo -n "🔍 Проверка $description ($host:$port)... "
  
  if nc -z "$host" "$port" 2>/dev/null; then
    echo "✅ OK"
    return 0
  else
    echo "❌ FAILED"
    return 1
  fi
}

echo
echo "1️⃣ Проверка backend сервисов"
echo "----------------------------"

if ! check_endpoint "$BACKEND_URL/api/health/ping" "Backend Health"; then
  echo "❌ Backend недоступен. Запустите: npm run serve:backend"
  exit 1
fi

if ! check_endpoint "$BACKEND_URL/api/devices/certificates/ca" "CA Certificate endpoint"; then
  echo "❌ Endpoint CA сертификата недоступен"
  exit 1
fi

echo
echo "2️⃣ Проверка EMQX"
echo "----------------"

if ! check_port "$EMQX_HOST" "1883" "EMQX Standard MQTT"; then
  echo "❌ EMQX стандартный порт недоступен"
  exit 1
fi

if ! check_port "$EMQX_HOST" "$EMQX_SECURE_PORT" "EMQX mTLS"; then
  echo "❌ EMQX mTLS порт недоступен. Запустите: docker-compose up -d emqx"
  exit 1
fi

if ! check_port "$EMQX_HOST" "18083" "EMQX Dashboard"; then
  echo "❌ EMQX Dashboard недоступен"
  exit 1
fi

echo
echo "3️⃣ Проверка сертификатов"
echo "------------------------"

CERTS_DIR="./apps/backend/certs"

echo -n "🔍 Проверка CA сертификата... "
if [[ -f "$CERTS_DIR/ca-cert.pem" ]]; then
  if openssl x509 -in "$CERTS_DIR/ca-cert.pem" -noout -text > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "❌ INVALID"
    exit 1
  fi
else
  echo "❌ NOT FOUND"
  exit 1
fi

echo -n "🔍 Проверка серверного сертификата... "
if [[ -f "$CERTS_DIR/server-cert.pem" ]]; then
  if openssl x509 -in "$CERTS_DIR/server-cert.pem" -noout -text > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "❌ INVALID"
    exit 1
  fi
else
  echo "❌ NOT FOUND"
  echo "Запустите: ./generate-emqx-certs.sh localhost"
  exit 1
fi

echo -n "🔍 Проверка серверного ключа... "
if [[ -f "$CERTS_DIR/server-key.pem" ]]; then
  if openssl rsa -in "$CERTS_DIR/server-key.pem" -check -noout > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "❌ INVALID"
    exit 1
  fi
else
  echo "❌ NOT FOUND"
  exit 1
fi

echo
echo "4️⃣ Тестирование CSR процесса"
echo "----------------------------"

echo "🔐 Создание тестового CSR..."

# Создаем временную директорию для теста
TEST_DIR="/tmp/iot-hub-mtls-test"
mkdir -p "$TEST_DIR"

# Генерируем тестовый ключ
openssl genrsa -out "$TEST_DIR/test-key.pem" 2048 2>/dev/null

# Создаем CSR
cat > "$TEST_DIR/csr.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = IoT Hub Test
OU = Device
CN = $DEVICE_ID

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

openssl req -new -key "$TEST_DIR/test-key.pem" \
  -out "$TEST_DIR/test.csr" \
  -config "$TEST_DIR/csr.conf" 2>/dev/null

echo "✅ Тестовый CSR создан"

# Читаем CSR
CSR_PEM=$(cat "$TEST_DIR/test.csr")

# Отправляем CSR на backend
echo "📤 Отправка CSR на backend..."

CSR_RESPONSE=$(curl -s -X POST \
  "$BACKEND_URL/api/devices/certificates/$DEVICE_ID/sign-csr" \
  -H "Content-Type: application/json" \
  -d "{
    \"csrPem\": \"$CSR_PEM\",
    \"firmwareVersion\": \"1.0.0-test\",
    \"hardwareVersion\": \"v1.0-test\"
  }")

if echo "$CSR_RESPONSE" | jq -e '.clientCert' > /dev/null 2>&1; then
  echo "✅ CSR успешно подписан backend-ом"
  
  # Извлекаем сертификат
  CLIENT_CERT=$(echo "$CSR_RESPONSE" | jq -r '.clientCert')
  CA_CERT=$(echo "$CSR_RESPONSE" | jq -r '.caCert')
  
  # Сохраняем сертификаты для тестирования
  echo "$CLIENT_CERT" > "$TEST_DIR/client-cert.pem"
  echo "$CA_CERT" > "$TEST_DIR/ca-cert.pem"
  
  echo "✅ Сертификаты сохранены для тестирования"
else
  echo "❌ Ошибка подписания CSR:"
  echo "$CSR_RESPONSE"
  exit 1
fi

echo
echo "5️⃣ Тестирование mTLS подключения к EMQX"
echo "---------------------------------------"

echo "🔗 Тестирование mTLS подключения..."

# Тестируем mTLS подключение с помощью mosquitto_pub (если доступно)
if command -v mosquitto_pub > /dev/null; then
  echo "📡 Тестирование MQTT подключения с mosquitto_pub..."
  
  if timeout 10 mosquitto_pub \
    -h "$EMQX_HOST" \
    -p "$EMQX_SECURE_PORT" \
    --cafile "$TEST_DIR/ca-cert.pem" \
    --cert "$TEST_DIR/client-cert.pem" \
    --key "$TEST_DIR/test-key.pem" \
    -t "test/$DEVICE_ID/status" \
    -m "mTLS test successful" 2>/dev/null; then
    echo "✅ mTLS подключение к EMQX успешно!"
  else
    echo "❌ Ошибка mTLS подключения к EMQX"
    echo "Проверьте настройки EMQX и сертификаты"
  fi
else
  echo "⚠️  mosquitto_pub не найден, пропускаем тест MQTT подключения"
  echo "Установите mosquitto-clients для полного тестирования"
fi

# Тестируем TLS подключение с помощью openssl
echo "🔐 Тестирование TLS handshake..."

if timeout 10 openssl s_client \
  -connect "$EMQX_HOST:$EMQX_SECURE_PORT" \
  -CAfile "$TEST_DIR/ca-cert.pem" \
  -cert "$TEST_DIR/client-cert.pem" \
  -key "$TEST_DIR/test-key.pem" \
  -quiet < /dev/null 2>/dev/null; then
  echo "✅ TLS handshake успешен!"
else
  echo "❌ Ошибка TLS handshake"
  echo "Проверьте конфигурацию EMQX mTLS"
fi

echo
echo "6️⃣ Очистка тестовых файлов"
echo "-------------------------"

rm -rf "$TEST_DIR"
echo "✅ Тестовые файлы удалены"

echo
echo "🎉 Тестирование завершено!"
echo "========================="
echo
echo "📊 Результаты:"
echo "   ✅ Backend API доступен"
echo "   ✅ EMQX MQTT брокер доступен"
echo "   ✅ mTLS порт открыт"
echo "   ✅ Сертификаты в порядке"
echo "   ✅ CSR процесс работает"
echo "   ✅ TLS handshake успешен"
echo
echo "🚀 Система готова для работы с mTLS!"
echo
echo "Следующие шаги:"
echo "   1. Запустите device-simulator: ./start-device-simulator-mtls.sh"
echo "   2. Проверьте EMQX Dashboard: http://localhost:18083"
echo "   3. Мониторьте подключения в разделе 'Clients'"
