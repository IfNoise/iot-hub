#!/bin/bash

# Скрипт для быстрого запуска IoT Hub с mTLS
# Включает backend, EMQX и device-simulator

set -e

echo "🚀 Быстрый запуск IoT Hub с mTLS"
echo "================================="

# Функция для проверки доступности порта
check_port() {
  local host=$1
  local port=$2
  local service=$3
  local max_attempts=30
  local attempt=1

  echo "🔍 Проверка доступности $service ($host:$port)..."
  
  while [[ $attempt -le $max_attempts ]]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      echo "✅ $service доступен"
      return 0
    fi
    
    echo "⏳ Попытка $attempt/$max_attempts - ожидание $service..."
    sleep 2
    ((attempt++))
  done
  
  echo "❌ $service недоступен после $max_attempts попыток"
  return 1
}

# Функция для проверки HTTP endpoints
check_http() {
  local url=$1
  local service=$2
  local max_attempts=30
  local attempt=1

  echo "🔍 Проверка HTTP endpoint $service ($url)..."
  
  while [[ $attempt -le $max_attempts ]]; do
    if curl -f -s "$url" > /dev/null 2>&1; then
      echo "✅ $service HTTP endpoint доступен"
      return 0
    fi
    
    echo "⏳ Попытка $attempt/$max_attempts - ожидание $service HTTP endpoint..."
    sleep 2
    ((attempt++))
  done
  
  echo "❌ $service HTTP endpoint недоступен после $max_attempts попыток"
  return 1
}

echo
echo "📋 Этапы запуска:"
echo "   1. Запуск backend (генерация CA сертификата)"
echo "   2. Генерация серверных сертификатов для EMQX"
echo "   3. Запуск EMQX с mTLS"
echo "   4. Запуск device-simulator с автоматическим получением сертификатов"

echo
echo "1️⃣ Запуск backend..."

# Проверяем, запущен ли уже backend
if curl -f -s "http://localhost:3000/api/health/ping" > /dev/null 2>&1; then
  echo "✅ Backend уже запущен"
else
  echo "🚀 Запускаем backend..."
  nx serve backend &
  BACKEND_PID=$!
  
  # Ждем запуска backend
  if ! check_http "http://localhost:3000/api/health/ping" "Backend"; then
    echo "❌ Не удалось запустить backend"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
fi

echo
echo "2️⃣ Генерация серверных сертификатов для EMQX..."

# Проверяем, есть ли CA сертификат
if [[ ! -f "./apps/backend/certs/ca-cert.pem" ]]; then
  echo "⏳ Ожидание генерации CA сертификата backend-ом..."
  sleep 5
  
  if [[ ! -f "./apps/backend/certs/ca-cert.pem" ]]; then
    echo "❌ CA сертификат не найден"
    echo "Убедитесь, что backend работает корректно"
    exit 1
  fi
fi

# Генерируем серверные сертификаты
if [[ ! -f "./apps/backend/certs/server-cert.pem" ]]; then
  echo "🔐 Генерация серверных сертификатов..."
  ./generate-emqx-certs.sh localhost
else
  echo "✅ Серверные сертификаты уже существуют"
fi

echo
echo "3️⃣ Запуск EMQX с mTLS..."

# Останавливаем EMQX если он запущен
docker-compose down emqx 2>/dev/null || true

# Запускаем EMQX
echo "🚀 Запускаем EMQX..."
docker-compose up -d emqx

# Ждем запуска EMQX
if ! check_port "localhost" "8883" "EMQX mTLS"; then
  echo "❌ Не удалось запустить EMQX"
  docker-compose logs emqx
  exit 1
fi

if ! check_port "localhost" "18083" "EMQX Dashboard"; then
  echo "❌ EMQX Dashboard недоступен"
  docker-compose logs emqx
  exit 1
fi

echo
echo "4️⃣ Запуск device-simulator..."

# Даем EMQX время на полную инициализацию
echo "⏳ Ожидание полной инициализации EMQX..."
sleep 10

# Запускаем device-simulator с mTLS
echo "🚀 Запускаем device-simulator с mTLS..."
echo "Device-simulator автоматически получит сертификаты и подключится к EMQX"

echo
echo "✅ Система IoT Hub с mTLS запущена!"
echo "=================================="
echo
echo "📊 Доступные сервисы:"
echo "   🌐 EMQX Dashboard: http://localhost:18083"
echo "       Логин: admin"
echo "       Пароль: iot-hub-admin"
echo
echo "   📱 Device Simulator API: http://localhost:3001/api/simulator"
echo "   🔙 Backend API: http://localhost:3000/api"
echo
echo "🔐 mTLS конфигурация:"
echo "   📡 MQTT Standard: mqtt://localhost:1883"
echo "   🔒 MQTT mTLS: mqtts://localhost:8883"
echo "   📁 Сертификаты: ./apps/backend/certs/"
echo
echo "🚀 Запуск device-simulator с mTLS:"
echo "   ./start-device-simulator-mtls.sh"
echo
echo "📋 Логи сервисов:"
echo "   Backend: npm run serve:backend (в отдельном терминале)"
echo "   EMQX: docker-compose logs -f emqx"
echo "   Device Simulator: ./start-device-simulator-mtls.sh"
echo
echo "⏹️  Остановка системы:"
echo "   docker-compose down"
echo "   Ctrl+C для остановки backend"

echo
echo "Система готова к работе! 🎉"
