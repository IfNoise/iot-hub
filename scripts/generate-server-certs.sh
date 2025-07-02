#!/bin/bash
#
# Скрипт для генерации серверных сертификатов для EMQX
# Используется существующий CA из директории certs
#

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Директория для сертификатов
CERTS_DIR="./certs"
CA_CERT="${CERTS_DIR}/ca-cert.pem"
CA_KEY="${CERTS_DIR}/ca-key-pkcs8.pem" # Используем PKCS#8 ключ
SERVER_KEY="${CERTS_DIR}/server-key.pem"
SERVER_KEY_PKCS8="${CERTS_DIR}/server-key-pkcs8.pem" # Ключ сервера в PKCS#8
SERVER_CERT="${CERTS_DIR}/server-cert.pem"
SERVER_CSR="${CERTS_DIR}/server.csr"
SERVER_CONFIG="${CERTS_DIR}/openssl-server.cnf"

echo -e "${YELLOW}Генерация серверных сертификатов для EMQX${NC}"

# Проверка наличия CA сертификата и ключа
if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
    echo -e "${RED}Ошибка: CA сертификат или ключ не найдены в ${CERTS_DIR}${NC}"
    echo -e "${YELLOW}Сначала сгенерируйте CA с помощью generate-ca-certs.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Создание конфигурационного файла OpenSSL для сервера...${NC}"

# Создание конфигурационного файла для серверного сертификата
cat > ${SERVER_CONFIG} << EOF
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[ dn ]
CN = emqx.iot-hub
O = IoT Hub
OU = EMQX Server
C = RU
ST = Moscow
L = Moscow

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = emqx
DNS.2 = emqx.iot-hub
DNS.3 = localhost
IP.1 = 127.0.0.1

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ v3_req ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
EOF

echo -e "${YELLOW}Генерация приватного ключа сервера...${NC}"
openssl genrsa -out ${SERVER_KEY} 2048

echo -e "${YELLOW}Генерация запроса на подписание сертификата (CSR)...${NC}"
openssl req -new -key ${SERVER_KEY} -out ${SERVER_CSR} -config ${SERVER_CONFIG}

echo -e "${YELLOW}Подписание серверного сертификата с помощью CA...${NC}"
openssl x509 -req -in ${SERVER_CSR} -CA ${CA_CERT} -CAkey ${CA_KEY} \
    -CAcreateserial -out ${SERVER_CERT} -days 3650 \
    -extensions v3_req -extfile ${SERVER_CONFIG}

echo -e "${YELLOW}Проверка серверного сертификата...${NC}"
openssl x509 -in ${SERVER_CERT} -text -noout

echo -e "${YELLOW}Преобразование ключа сервера в формат PKCS#8...${NC}"
openssl pkcs8 -topk8 -nocrypt -in ${SERVER_KEY} -out ${SERVER_KEY_PKCS8}

echo -e "${YELLOW}Установка прав доступа...${NC}"
chmod 600 ${SERVER_KEY}
chmod 600 ${SERVER_KEY_PKCS8}
chmod 644 ${SERVER_CERT}

echo -e "${YELLOW}Удаление временных файлов...${NC}"
rm -f ${SERVER_CSR}

echo -e "${GREEN}Серверные сертификаты успешно сгенерированы:${NC}"
echo -e "${GREEN}- Серверный сертификат: ${SERVER_CERT}${NC}"
echo -e "${GREEN}- Серверный ключ (традиционный формат): ${SERVER_KEY}${NC}"
echo -e "${GREEN}- Серверный ключ (PKCS#8 формат): ${SERVER_KEY_PKCS8}${NC}"
echo -e "${YELLOW}Обновите том сертификатов с помощью скрипта init-certs-volume.sh${NC}"
