#!/bin/bash

# test-device-simulator.sh
# Скрипт для тестирования симулятора устройства и MQTT RPC API

echo "🧪 Тестирование IoT Device Simulator и MQTT RPC API"
echo "=================================================="

# Конфигурация
USER_ID="test-user"
DEVICE_ID="test-device"
API_URL="http://localhost:3000/api"
MQTT_HOST="localhost"
MQTT_PORT="1883"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода заголовков
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Функция для проверки статуса
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# Функция для ожидания
wait_seconds() {
    echo -e "${YELLOW}⏳ Ожидание $1 секунд...${NC}"
    sleep $1
}

print_header "Шаг 1: Проверка MQTT брокера"

# Проверяем, запущен ли MQTT брокер
if command -v mosquitto_pub &> /dev/null; then
    echo "📡 Проверка подключения к MQTT брокеру..."
    mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "test/topic" -m "test" -q 1 2>/dev/null
    check_status "MQTT брокер доступен"
else
    echo -e "${YELLOW}⚠️  mosquitto_pub не найден. Устанавливаем mosquitto-clients...${NC}"
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y mosquitto-clients
    elif command -v brew &> /dev/null; then
        brew install mosquitto
    else
        echo -e "${RED}❌ Не удалось установить mosquitto-clients${NC}"
        echo "   Пожалуйста, установите MQTT брокер и клиенты вручную"
    fi
fi

print_header "Шаг 2: Проверка API сервера"

# Проверяем доступность API
echo "🔗 Проверка доступности API сервера..."
curl -s -f -X POST $API_URL/mqtt/status > /dev/null
check_status "API сервер доступен" || {
    echo -e "${RED}❌ API сервер недоступен. Убедитесь, что backend запущен на порту 3000${NC}"
    exit 1
}

# Получаем статус MQTT в API
echo "📊 Получение статуса MQTT из API..."
MQTT_STATUS=$(curl -s -X POST $API_URL/mqtt/status)
echo "   Ответ: $MQTT_STATUS"

print_header "Шаг 3: Запуск симулятора устройства"

echo "🚀 Запуск симулятора устройства в фоне..."
echo "   User ID: $USER_ID"
echo "   Device ID: $DEVICE_ID"
echo "   MQTT: $MQTT_HOST:$MQTT_PORT"

# Запускаем симулятор в фоне
node device-simulator.js \
    --user-id $USER_ID \
    --device-id $DEVICE_ID \
    --mqtt-host $MQTT_HOST \
    --mqtt-port $MQTT_PORT > simulator.log 2>&1 &

SIMULATOR_PID=$!
echo "   PID симулятора: $SIMULATOR_PID"

# Функция для остановки симулятора при выходе
cleanup() {
    echo -e "\n${YELLOW}🛑 Остановка симулятора...${NC}"
    kill $SIMULATOR_PID 2>/dev/null
    wait $SIMULATOR_PID 2>/dev/null
    echo -e "${GREEN}✅ Симулятор остановлен${NC}"
}
trap cleanup EXIT

wait_seconds 3

# Проверяем, что симулятор запустился
if ps -p $SIMULATOR_PID > /dev/null; then
    check_status "Симулятор устройства запущен"
else
    echo -e "${RED}❌ Ошибка запуска симулятора${NC}"
    echo "Лог симулятора:"
    cat simulator.log
    exit 1
fi

print_header "Шаг 4: Тестирование RPC команд"

# Тест 1: Получение состояния устройства
echo "📱 Тест 1: Получение состояния устройства"
RESPONSE=$(curl -s -X POST $API_URL/mqtt/device/command \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"getDeviceState\",
        \"timeout\": 5000
    }")

echo "   Ответ: $RESPONSE"
if echo "$RESPONSE" | grep -q '"result"'; then
    check_status "getDeviceState - успешно"
else
    check_status "getDeviceState - ошибка"
fi

wait_seconds 1

# Тест 2: Получение данных сенсоров
echo "🌡️  Тест 2: Получение данных сенсоров"
RESPONSE=$(curl -s -X POST $API_URL/mqtt/device/command \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"getSensors\",
        \"timeout\": 5000
    }")

echo "   Ответ: $RESPONSE"
if echo "$RESPONSE" | grep -q '"temperature"'; then
    check_status "getSensors - успешно"
else
    check_status "getSensors - ошибка"
fi

wait_seconds 1

# Тест 3: Обновление дискретного таймера
echo "⏰ Тест 3: Обновление дискретного таймера"
RESPONSE=$(curl -s -X POST $API_URL/mqtt/device/command \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"updateDiscreteTimer\",
        \"params\": {
            \"id\": 1,
            \"enabled\": true,
            \"schedule\": \"0 8 * * *\",
            \"duration\": 300,
            \"channel\": 1
        },
        \"timeout\": 5000
    }")

echo "   Ответ: $RESPONSE"
if echo "$RESPONSE" | grep -q '"enabled":true'; then
    check_status "updateDiscreteTimer - успешно"
else
    check_status "updateDiscreteTimer - ошибка"
fi

wait_seconds 1

# Тест 4: Команда без ответа
echo "🔄 Тест 4: Команда без ответа (reboot)"
RESPONSE=$(curl -s -X POST $API_URL/mqtt/device/command/no-response \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"reboot\"
    }")

echo "   Ответ: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    check_status "reboot (no-response) - успешно"
else
    check_status "reboot (no-response) - ошибка"
fi

wait_seconds 1

# Тест 5: Неизвестная команда
echo "❓ Тест 5: Неизвестная команда"
RESPONSE=$(curl -s -X POST $API_URL/mqtt/device/command \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$USER_ID\",
        \"deviceId\": \"$DEVICE_ID\",
        \"method\": \"unknownMethod\",
        \"timeout\": 5000
    }")

echo "   Ответ: $RESPONSE"
if echo "$RESPONSE" | grep -q '"error"'; then
    check_status "unknownMethod (ошибка ожидается) - успешно"
else
    check_status "unknownMethod - неожиданный ответ"
fi

print_header "Шаг 5: Мониторинг симулятора"

echo "📊 Логи симулятора за последние секунды:"
tail -10 simulator.log

echo -e "\n${GREEN}🎉 Тестирование завершено!${NC}"
echo -e "${BLUE}📖 Дополнительная информация:${NC}"
echo "   - Симулятор продолжает работать"
echo "   - Логи симулятора: ./simulator.log"
echo "   - API документация: http://localhost:3000/api"
echo "   - Для остановки нажмите Ctrl+C"

# Мониторинг в реальном времени
echo -e "\n${YELLOW}📡 Мониторинг в реальном времени (Ctrl+C для выхода):${NC}"
while true; do
    echo -e "\n$(date): Получение состояния устройства..."
    curl -s -X POST $API_URL/mqtt/device/command \
        -H "Content-Type: application/json" \
        -d "{
            \"userId\": \"$USER_ID\",
            \"deviceId\": \"$DEVICE_ID\",
            \"method\": \"getSensors\",
            \"timeout\": 3000
        }" | jq '.result // empty' 2>/dev/null || echo "Ошибка получения данных"
    
    sleep 10
done
