#!/bin/bash

set -e

# 1. Генерация ключей
openssl genrsa -out device.key.pem 2048

# 2. Создание CSR (Certificate Signing Request)
DEVICE_ID="chip-$(uuidgen | cut -d'-' -f1)"
openssl req -new -key device.key.pem -out device.csr -subj "/CN=$DEVICE_ID"

# 3. Считываем CSR в одну строку с экранированными переводами строк
CSR_PEM=$(awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' device.csr)

# 4. Подготовка данных
MODEL="Secure-RSA2048"
FIRMWARE="1.2.3"

# 5. Curl-запрос для регистрации устройства
echo "Регистрируем устройство с ID: $DEVICE_ID"
curl -X POST http://localhost:3000/devices/sign-device \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$DEVICE_ID\",
    \"model\": \"$MODEL\",
    \"csrPem\": \"$CSR_PEM\",
    \"firmwareVersion\": \"$FIRMWARE\"
  }"

# 6. Очистка временных файлов
rm -f device.key.pem device.csr

echo -e "\n\nУстройство успешно зарегистрировано!"
