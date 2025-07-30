#!/bin/bash
# Скрипт для создания топиков Kafka для микросервиса UserManagement

echo "🚀 Создание топиков Kafka для IoT Hub..."

# Ждем пока Kafka станет доступна
echo "⏳ Ожидание готовности Kafka..."
sleep 10

# Массив топиков для создания
declare -a topics=(
    "user.created"
    "user.updated" 
    "user.deleted"
    "user.organization.assigned"
    "user.group.assigned"
)

# Создаем каждый топик
for topic in "${topics[@]}"
do
    echo "📝 Создание топика: $topic"
    
    docker exec iot-kafka kafka-topics \
        --create \
        --bootstrap-server localhost:9092 \
        --topic $topic \
        --partitions 3 \
        --replication-factor 1 \
        --if-not-exists
    
    if [ $? -eq 0 ]; then
        echo "✅ Топик $topic создан успешно"
    else
        echo "❌ Ошибка создания топика $topic"
    fi
done

echo ""
echo "📊 Список созданных топиков:"
docker exec iot-kafka kafka-topics --list --bootstrap-server localhost:9092

echo ""
echo "🎉 Инициализация топиков завершена!"
