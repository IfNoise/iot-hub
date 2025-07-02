#!/bin/bash

# Генерация CA сертификата и ключей в формате PKCS#8
# Скрипт генерирует CA сертификат и ключи для mTLS
# Автор: GitHub Copilot

set -e

# Директория для сертификатов
CERTS_DIR="/home/noise83/Projects/Nodejs/iot-hub/certs"
mkdir -p "$CERTS_DIR"

echo "Генерация CA сертификата для IoT Hub..."

# Создаем конфигурационный файл для OpenSSL
cat > "$CERTS_DIR/openssl-ca.cnf" << EOF
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[ dn ]
CN = IoT Hub Root CA
O = IoT Hub
OU = Certificate Authority
C = RU
ST = Moscow
L = Moscow

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

# Генерация ключа и сертификата CA
echo "1. Генерация ключа CA..."
openssl genrsa -out "$CERTS_DIR/ca-key.pem" 2048

echo "2. Преобразование ключа в формат PKCS#8..."
openssl pkcs8 -topk8 -nocrypt -in "$CERTS_DIR/ca-key.pem" -out "$CERTS_DIR/ca-key-pkcs8.pem"

echo "3. Генерация самоподписанного CA сертификата..."
openssl req -new -x509 -key "$CERTS_DIR/ca-key.pem" -out "$CERTS_DIR/ca-cert.pem" -days 3650 -config "$CERTS_DIR/openssl-ca.cnf"

# Проверка сертификата
echo "4. Проверка созданного CA сертификата..."
openssl x509 -in "$CERTS_DIR/ca-cert.pem" -text -noout | grep "Subject:"
openssl x509 -in "$CERTS_DIR/ca-cert.pem" -text -noout | grep "Issuer:"
openssl x509 -in "$CERTS_DIR/ca-cert.pem" -text -noout | grep "Validity"

# Установка правильных прав доступа
echo "17. Установка правильных прав доступа для сертификатов..."
chmod 644 "$CERTS_DIR/ca-cert.pem"
chmod 600 "$CERTS_DIR/ca-key.pem"
chmod 600 "$CERTS_DIR/ca-key-pkcs8.pem"

echo "CA сертификаты успешно созданы!"
echo "CA сертификат: $CERTS_DIR/ca-cert.pem"
echo "CA ключ (PKCS#8): $CERTS_DIR/ca-key-pkcs8.pem"

# Генерация серверных сертификатов для EMQX
echo "Генерация серверных сертификатов для EMQX..."
./scripts/generate-server-certs.sh

echo "Все сертификаты успешно созданы!"
