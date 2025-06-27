# Решение проблемы сетевых конфликтов Docker с GitHub Copilot

## Проблема

При запуске Docker Compose GitHub Copilot теряет соединение (net::ERR_NETWORK_CHANGED) из-за изменений в сетевой конфигурации системы.

## Причины

1. **Перегрузка системы**: Nx daemon потреблял 117% CPU, множество Docker проектов
2. **Сетевые конфликты**: Docker создает bridge-сети, меняет iptables и маршрутизацию
3. **Нехватка ресурсов**: 15GB RAM заполнены, swap используется

## РЕШЕНИЯ (по приоритету)

### 1. НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ ✅

```bash
# Остановить проблемный Nx daemon
npx nx reset

# Использовать оптимизированную версию
docker compose -f docker-compose.optimized.yml up -d
```

### 2. ИЗОЛЯЦИЯ DOCKER СЕТЕЙ

```bash
# Создать изолированную сеть только для iot-hub
docker network create --driver bridge --subnet=172.30.0.0/16 iot-isolated

# Или использовать host-сеть (НЕ рекомендуется для production)
# В docker-compose.yml добавить: network_mode: "host"
```

### 3. СИСТЕМНЫЕ НАСТРОЙКИ

```bash
# Добавить в /etc/docker/daemon.json:
{
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    }
  ],
  "iptables": false
}

# Перезапустить Docker
sudo systemctl restart docker
```

### 4. VS CODE НАСТРОЙКИ

В settings.json VS Code:

```json
{
  "github.copilot.advanced": {
    "debug.overrideEngine": "stable"
  },
  "http.proxySupport": "off"
}
```

### 5. АЛЬТЕРНАТИВНЫЙ ЗАПУСК

```bash
# Запуск только необходимых сервисов
docker compose -f docker-compose.optimized.yml up postgres redis -d
docker compose -f docker-compose.optimized.yml up backend -d
# Запускать EMQX последним или в host-режиме
```

## МОНИТОРИНГ

```bash
# Проверка нагрузки перед запуском
uptime && free -h

# Мониторинг сетевых изменений
watch -n 2 'ip route | head -10'

# Проверка Docker сетей
docker network ls
```

## BACKUP ПЛАН

Если проблема продолжается:

1. **Остановить другие Docker проекты**: lokigrafana, searxng, mongodb
2. **Использовать внешние базы данных** вместо Docker
3. **Разработка без Docker**: использовать локальные Postgres/Redis
4. **Переключиться на Podman** как альтернативу Docker

## СОЗДАННЫЕ ФАЙЛЫ

- `docker-compose.optimized.yml` - версия с ограничениями ресурсов
- Этот файл с решениями

## КОНТАКТЫ ДЛЯ ДЕБАГА

- Load average должен быть < 8.0
- Память < 12GB
- Swap usage < 50%
