#!/bin/bash

set -e

# 1. Генерация ключей
openssl genrsa -out device.key.pem 2048
openssl rsa -in device.key.pem -pubout -out device.pub.pem

# 2. Экспорт публичного ключа в DER-формате во временный файл
openssl rsa -in device.key.pem -pubout -outform DER -out device.pub.der

# 3. Вычисление SHA-256 fingerprint из DER-файла
FINGERPRINT=$(openssl dgst -sha256 -binary device.pub.der | xxd -p -c 256)

# 4. Считываем публичный ключ в одну строку с экранированными переводами строк
PUBLIC_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' device.pub.pem)

# 5. Подготовка данных
DEVICE_ID="chip-$(uuidgen | cut -d'-' -f1)"
DEVICE_NAME="CryptoSensor X"
MODEL="Secure-RSA2048"
OWNER_ID="null"
FIRMWARE="1.2.3"

# 6. Curl-запрос
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"name\": \"$DEVICE_NAME\",
    \"model\": \"$MODEL\",
    \"publicKeyPem\": \"$PUBLIC_KEY\",
    \"fingerprint\": \"$FINGERPRINT\",
    \"ownerId\": $OWNER_ID,
    \"firmwareVersion\": \"$FIRMWARE\"
  }"
