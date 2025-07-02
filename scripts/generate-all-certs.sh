#!/bin/bash

# Генерация всех сертификатов для IoT Hub в современном формате PKCS#8
# Автор: IoT Hub Team
# Дата создания: $(date)

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
CERTS_DIR="./certs-new"
BACKUP_DIR="./backup-certs-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}🔐 Генерация нового комплекта сертификатов IoT Hub${NC}"
echo -e "${BLUE}=============================================${NC}"

# Создаем директории
echo -e "${YELLOW}📁 Создание директорий...${NC}"
mkdir -p "$CERTS_DIR"
mkdir -p "$BACKUP_DIR"

# Если существуют старые сертификаты, создаем бэкап
if [ -d "./certs" ] && [ "$(ls -A ./certs)" ]; then
    echo -e "${YELLOW}💾 Создание резервной копии старых сертификатов...${NC}"
    cp -r ./certs/* "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✅ Резервная копия создана: $BACKUP_DIR${NC}"
fi

# Переходим в директорию сертификатов
cd "$CERTS_DIR"

# =============================================================================
# 1. Генерация Root CA (Certificate Authority)
# =============================================================================

echo -e "${BLUE}🏛️  Генерация Root CA...${NC}"

# Генерируем приватный ключ CA в PKCS#8 формате
openssl genpkey -algorithm RSA -pkcs8 -out ca-key.pem -pkcs8 -pass pass: -cipher-bits 2048

# Устанавливаем правильные права доступа
chmod 600 ca-key.pem

# Создаем конфигурационный файл для CA
cat > ca.conf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = IoT Hub
OU = Certificate Authority
CN = IoT Hub Root CA
emailAddress = admin@iothub.local

[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF

# Генерируем самоподписанный CA сертификат
openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 3650 -config ca.conf -extensions v3_ca

echo -e "${GREEN}✅ Root CA создан${NC}"

# =============================================================================
# 2. Генерация серверного сертификата для EMQX
# =============================================================================

echo -e "${BLUE}🌐 Генерация серверного сертификата для EMQX...${NC}"

# Генерируем приватный ключ сервера в PKCS#8 формате
openssl genpkey -algorithm RSA -out server-key.pem -pkcs8 -pass pass: -cipher-bits 2048

# Создаем конфигурационный файл для серверного сертификата
cat > server.conf << EOF
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
CN = localhost
emailAddress = mqtt@iothub.local

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature, nonRepudiation
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = emqx
DNS.3 = emqx-mtls
DNS.4 = iot-emqx
IP.1 = 127.0.0.1
IP.2 = 172.20.0.2
IP.3 = 172.20.0.3
EOF

# Генерируем CSR для сервера
openssl req -new -key server-key.pem -out server.csr -config server.conf -extensions v3_req

# Подписываем серверный сертификат с помощью CA
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 365 -extensions v3_req -extfile server.conf

# Удаляем CSR файл
rm server.csr

echo -e "${GREEN}✅ Серверный сертификат создан${NC}"

# =============================================================================
# 3. Генерация тестового клиентского сертификата
# =============================================================================

echo -e "${BLUE}📱 Генерация тестового клиентского сертификата...${NC}"

# Генерируем приватный ключ клиента в PKCS#8 формате
openssl genpkey -algorithm RSA -out test-device-key.pem -pkcs8 -pass pass: -cipher-bits 2048

# Создаем конфигурационный файл для клиентского сертификата
cat > test-device.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = IoT Hub
OU = Devices
CN = test-device-001
emailAddress = device@iothub.local

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Генерируем CSR для клиента
openssl req -new -key test-device-key.pem -out test-device.csr -config test-device.conf -extensions v3_req

# Подписываем клиентский сертификат с помощью CA
openssl x509 -req -in test-device.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out test-device-cert.pem -days 365 -extensions v3_req -extfile test-device.conf

# Удаляем CSR файл
rm test-device.csr

echo -e "${GREEN}✅ Тестовый клиентский сертификат создан${NC}"

# =============================================================================
# 4. Установка правильных прав доступа
# =============================================================================

echo -e "${BLUE}🔒 Установка прав доступа...${NC}"

# Приватные ключи - только владелец может читать
chmod 600 *.pem | grep -E "(key|private)" || true
chmod 600 ca-key.pem server-key.pem test-device-key.pem

# Сертификаты - владелец и группа могут читать
chmod 644 *.pem | grep -E "(cert|crt)" || true
chmod 644 ca-cert.pem server-cert.pem test-device-cert.pem

# Удаляем временные файлы
rm -f *.conf *.csr *.srl

echo -e "${GREEN}✅ Права доступа установлены${NC}"

# =============================================================================
# 5. Проверка сертификатов
# =============================================================================

echo -e "${BLUE}🔍 Проверка созданных сертификатов...${NC}"

echo -e "${YELLOW}📋 Информация о CA сертификате:${NC}"
openssl x509 -in ca-cert.pem -text -noout | head -20

echo -e "${YELLOW}📋 Проверка серверного сертификата:${NC}"
openssl verify -CAfile ca-cert.pem server-cert.pem

echo -e "${YELLOW}📋 Проверка клиентского сертификата:${NC}"
openssl verify -CAfile ca-cert.pem test-device-cert.pem

echo -e "${YELLOW}📋 Проверка форматов ключей:${NC}"
echo "CA ключ формат:"
head -1 ca-key.pem
echo "Серверный ключ формат:"
head -1 server-key.pem
echo "Клиентский ключ формат:"
head -1 test-device-key.pem

# Возвращаемся в корневую директорию
cd ..

# =============================================================================
# 6. Итоговая информация
# =============================================================================

echo -e "${GREEN}🎉 Генерация сертификатов завершена успешно!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}📁 Созданные файлы в директории $CERTS_DIR:${NC}"
ls -la "$CERTS_DIR"
echo ""
echo -e "${BLUE}🔧 Следующие шаги:${NC}"
echo -e "${YELLOW}1. Обновить конфигурацию backend для использования новой директории${NC}"
echo -e "${YELLOW}2. Обновить docker-compose.yml для монтирования $CERTS_DIR${NC}"
echo -e "${YELLOW}3. Обновить EMQX конфигурацию${NC}"
echo -e "${YELLOW}4. Перезапустить все сервисы${NC}"
echo ""
echo -e "${GREEN}✅ Все сертификаты используют современный PKCS#8 формат!${NC}"
