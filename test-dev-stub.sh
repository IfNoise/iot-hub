#!/bin/bash

# Скрипт для тестирования Development Stub функциональности
# Тестирует различные конфигурации пользователя

echo "🧪 Тестирование Development Stub для Keycloak OAuth2 Middleware"
echo "==============================================================="

# Функция для тестирования API endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    echo ""
    echo "📡 Тестируем: $description"
    echo "Endpoint: http://localhost:3000$endpoint"
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3000$endpoint")
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo "✅ Успешно (HTTP $http_status)"
        echo "Ответ: $body"
    else
        echo "❌ Ошибка (HTTP $http_status)"
        echo "Ответ: $body"
    fi
}

echo ""
echo "🔍 Текущие переменные окружения для Development Stub:"
echo "DEV_USER_ID=${DEV_USER_ID:-'(не установлено, используется по умолчанию: dev-user-id)'}"
echo "DEV_USER_EMAIL=${DEV_USER_EMAIL:-'(не установлено, используется по умолчанию: dev@example.com)'}"
echo "DEV_USER_NAME=${DEV_USER_NAME:-'(не установлено, используется по умолчанию: Dev User)'}"
echo "DEV_USER_ROLE=${DEV_USER_ROLE:-'(не установлено, используется по умолчанию: admin)'}"
echo "DEV_USER_AVATAR=${DEV_USER_AVATAR:-'(не установлено)'}"
echo "DEV_USER_EMAIL_VERIFIED=${DEV_USER_EMAIL_VERIFIED:-'(не установлено, используется по умолчанию: true)'}"

echo ""
echo "🌐 Тестирование API endpoints..."

# Публичные endpoints
test_endpoint "/api" "Базовый API endpoint"

# Защищённые endpoints
test_endpoint "/api/auth/me" "Информация о пользователе"
test_endpoint "/api/auth/admin" "Endpoint для администраторов"
test_endpoint "/api/auth/user" "Endpoint для пользователей"
test_endpoint "/api/users" "Список пользователей"
test_endpoint "/api/devices" "Список устройств"

echo ""
echo "📊 Swagger документация доступна по адресу:"
echo "   http://localhost:3000/api/docs"

echo ""
echo "🎯 Для тестирования различных ролей пользователей:"
echo "   export DEV_USER_ROLE=user"
echo "   # Перезапустите сервер"
echo "   npm exec nx run @iot-hub/backend:serve --configuration=development"

echo ""
echo "💡 Для тестирования обычного пользователя (не админа):"
echo "   export DEV_USER_EMAIL=user@example.com"
echo "   export DEV_USER_NAME='Regular User'"
echo "   export DEV_USER_ROLE=user"

echo ""
echo "✨ Тестирование завершено!"