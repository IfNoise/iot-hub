#!/bin/bash
#
# Скрипт для инициализации Docker volume с сертификатами
#

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Имя Docker volume
VOLUME_NAME="iot-hub-certs"
# Директория с исходными сертификатами
CERTS_DIR="./certs"
# Временный контейнер для инициализации тома
TEMP_CONTAINER="certs-init-container"

echo -e "${YELLOW}Инициализация тома для сертификатов: ${VOLUME_NAME}${NC}"

# Проверка наличия сертификатов в исходной директории
if [ ! -f "${CERTS_DIR}/ca-cert.pem" ] || [ ! -f "${CERTS_DIR}/ca-key-pkcs8.pem" ]; then
    echo -e "${RED}Ошибка: CA сертификаты не найдены в директории ${CERTS_DIR}${NC}"
    echo -e "${YELLOW}Пожалуйста, сначала сгенерируйте сертификаты с помощью скрипта generate-ca-certs.sh${NC}"
    exit 1
fi

# Проверка наличия серверных сертификатов
echo -e "${YELLOW}Проверка наличия серверных сертификатов...${NC}"
SERVER_CERTS_FOUND=false
if [ -f "${CERTS_DIR}/server-cert.pem" ] && [ -f "${CERTS_DIR}/server-key-pkcs8.pem" ]; then
    echo -e "${GREEN}Серверные сертификаты найдены и будут скопированы в том${NC}"
    SERVER_CERTS_FOUND=true
else
    echo -e "${YELLOW}Серверные сертификаты не найдены. Будут скопированы только CA сертификаты.${NC}"
    echo -e "${YELLOW}Вы можете сгенерировать серверные сертификаты с помощью скрипта generate-server-certs.sh${NC}"
fi

# Проверка существования Docker volume
if docker volume inspect ${VOLUME_NAME} &> /dev/null; then
    echo -e "${YELLOW}Том ${VOLUME_NAME} уже существует. Хотите его пересоздать? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Удаление существующего тома ${VOLUME_NAME}...${NC}"
        docker volume rm ${VOLUME_NAME}
        echo -e "${GREEN}Том удален.${NC}"
    else
        echo -e "${YELLOW}Продолжаем с существующим томом.${NC}"
    fi
fi

# Создание Docker volume, если он не существует
if ! docker volume inspect ${VOLUME_NAME} &> /dev/null; then
    echo -e "${YELLOW}Создание тома ${VOLUME_NAME}...${NC}"
    docker volume create ${VOLUME_NAME}
    echo -e "${GREEN}Том ${VOLUME_NAME} создан.${NC}"
fi

echo -e "${YELLOW}Создание временного контейнера для копирования сертификатов...${NC}"

# Создание временного контейнера для копирования файлов в том
docker run --rm -d --name ${TEMP_CONTAINER} \
    -v ${VOLUME_NAME}:/certs \
    -v $(pwd)/${CERTS_DIR}:/src \
    alpine sh -c "tail -f /dev/null"

echo -e "${YELLOW}Копирование сертификатов в том...${NC}"

# Копирование файлов
docker exec ${TEMP_CONTAINER} sh -c "
    mkdir -p /certs && 
    cp /src/ca-cert.pem /certs/ && 
    cp /src/ca-key-pkcs8.pem /certs/ && 
    chmod 640 /certs/ca-key*.pem && 
    chmod 644 /certs/ca-cert.pem"

# Копирование серверных сертификатов, если они найдены
if [ "$SERVER_CERTS_FOUND" = true ]; then
    echo -e "${YELLOW}Копирование серверных сертификатов...${NC}"
    docker exec ${TEMP_CONTAINER} sh -c "
        cp /src/server-cert.pem /certs/ && 
        cp /src/server-key-pkcs8.pem /certs/ && 
        chmod 640 /certs/server-key*.pem && 
        chmod 644 /certs/server-cert.pem"
fi

echo -e "${YELLOW}Проверка содержимого тома...${NC}"

# Проверка файлов
docker exec ${TEMP_CONTAINER} sh -c "ls -la /certs"

echo -e "${YELLOW}Установка групповых прав для пользователя EMQX...${NC}"
# EMQX контейнер работает от пользователя с UID=1000, GID=1000 (обычно emqx:emqx)
# Устанавливаем групповые права для всех файлов
docker exec ${TEMP_CONTAINER} sh -c "
    # Создаем группу emqx с GID=1000, если она не существует
    addgroup -g 1000 emqx 2>/dev/null || true
    # Добавляем группу emqx ко всем файлам
    chgrp -R emqx /certs
    # Убеждаемся, что все файлы читаемы группой
    chmod -R g+r /certs
    ls -la /certs"

echo -e "${YELLOW}Остановка временного контейнера...${NC}"

# Остановка временного контейнера
docker stop ${TEMP_CONTAINER}

echo -e "${GREEN}Том ${VOLUME_NAME} успешно инициализирован сертификатами.${NC}"
echo -e "${GREEN}Теперь вы можете запустить docker-compose с обновленной конфигурацией.${NC}"
