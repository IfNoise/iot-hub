#!/bin/bash

# Скрипт для генерации серверных сертификатов для EMQX mTLS
# Использование: ./generate-emqx-certs.sh [hostname]

set -e

HOSTNAME=${1:-localhost}
CERTS_DIR="./certs"
CA_DIR="$CERTS_DIR"
SERVER_DIR="$CERTS_DIR"

echo "🔐 Генерация серверных сертификатов для EMQX"
echo "   🌐 Hostname: $HOSTNAME"
echo "   📁 Certs Directory: $CERTS_DIR"

# Создаем директорию для сертификатов
mkdir -p "$CERTS_DIR"

# Проверяем, есть ли CA сертификат
if [[ ! -f "$CA_DIR/ca-cert.pem" ]]; then
  echo "❌ CA сертификат не найден!"
  echo "Сначала запустите backend для генерации CA сертификата или создайте его вручную"
  exit 1
fi

echo "✅ CA сертификат найден: $CA_DIR/ca-cert.pem"

# Проверяем, есть ли приватный ключ CA
if [[ ! -f "$CA_DIR/ca-key.pem" ]]; then
  echo "❌ Приватный ключ CA не найден: $CA_DIR/ca-key.pem"
  echo "Убедитесь, что backend запущен и создал CA сертификат"
  exit 1
fi

echo
echo "🔧 Генерация серверного ключа..."

# Генерируем приватный ключ для сервера
openssl genrsa -out "$SERVER_DIR/server-key.pem" 2048

echo "✅ Серверный ключ создан: $SERVER_DIR/server-key.pem"

echo
echo "📝 Создание запроса на сертификат (CSR)..."

# Создаем конфигурационный файл для CSR
cat > "$SERVER_DIR/server.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = IoT Hub
OU = MQTT Broker
CN = $HOSTNAME

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $HOSTNAME
DNS.2 = localhost
DNS.3 = emqx
DNS.4 = emqx-mtls
IP.1 = 127.0.0.1
IP.2 = 172.20.0.2
EOF

# Создаем запрос на сертификат
openssl req -new -key "$SERVER_DIR/server-key.pem" \
  -out "$SERVER_DIR/server.csr" \
  -config "$SERVER_DIR/server.conf"

echo "✅ CSR создан: $SERVER_DIR/server.csr"

echo
echo "🔐 Подписание серверного сертификата CA..."

# Создаем конфигурационный файл для подписания
cat > "$SERVER_DIR/server-ext.conf" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $HOSTNAME
DNS.2 = localhost
DNS.3 = emqx
DNS.4 = emqx-mtls
IP.1 = 127.0.0.1
IP.2 = 172.20.0.2
EOF

# Подписываем сертификат с помощью CA
openssl x509 -req -in "$SERVER_DIR/server.csr" \
  -CA "$CA_DIR/ca-cert.pem" \
  -CAkey "$CA_DIR/ca-key.pem" \
  -CAcreateserial \
  -out "$SERVER_DIR/server-cert.pem" \
  -days 365 \
  -extensions v3_req \
  -extfile "$SERVER_DIR/server-ext.conf" 

echo "✅ Серверный сертификат создан: $SERVER_DIR/server-cert.pem"

echo
echo "🔍 Проверка сертификата..."

# Проверяем сертификат
openssl x509 -in "$SERVER_DIR/server-cert.pem" -text -noout | grep -A 5 "Subject Alternative Name" || true

echo
echo "🧹 Очистка временных файлов..."

# Удаляем временные файлы
#rm -f "$SERVER_DIR/server.csr" "$SERVER_DIR/server.conf" "$SERVER_DIR/server-ext.conf" "$CA_DIR/ca-cert.srl"

echo
echo "📄 Установка правильных разрешений..."

# Устанавливаем правильные права доступа
chmod 600 "$SERVER_DIR/server-key.pem"
chmod 644 "$SERVER_DIR/server-cert.pem"
chmod 644 "$CA_DIR/ca-cert.pem"

echo
echo "✅ Серверные сертификаты готовы:"
echo "   🔑 Server Key:  $SERVER_DIR/server-key.pem"
echo "   📜 Server Cert: $SERVER_DIR/server-cert.pem"
echo "   🏛️  CA Cert:     $CA_DIR/ca-cert.pem"

echo
echo "🚀 Для запуска EMQX с mTLS используйте:"
echo "   docker-compose -f docker-compose.mtls.yml up -d"

echo
echo "🌐 После запуска EMQX будет доступен:"
echo "   📊 Dashboard: https://localhost:18083 (admin/iot-hub-admin)"
echo "   🔐 MQTT mTLS: mqtts://localhost:8883"
echo "   📡 MQTT:      mqtt://localhost:1883"

echo
echo "✨ Настройка серверных сертификатов завершена!"
