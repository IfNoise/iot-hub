# IoT Hub

Коммерческая платформа управления IoT-устройствами с производственной безопасностью.

## 🚀 Обзор

IoT Hub - это масштабируемая платформа для управления IoT-устройствами, обеспечивающая:

- **Безопасность уровня производства**: mTLS-коммуникация через EMQX (MQTT v5)
- **Управление пользователями**: Интеграция с Keycloak и OAuth2 Proxy
- **Привязка устройств**: QR-коды для безопасного связывания устройств с аккаунтами
- **Современный стек**: NestJS + PostgreSQL backend, Next.js frontend
- **Криптографическая защита**: Поддержка крипточипов ATECC608A
- **DevOps ready**: CI/CD, Docker, тесты и мониторинг

## 🏗️ Архитектура

```ascii
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Device    │    │   EMQX Broker   │    │   Backend API   │
│   (ESP32/STM32) │◄──►│   (mTLS/MQTT)   │◄──►│   (NestJS)      │
│   + ATECC608A   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         └──────────────►│   Frontend UI   │◄────────────┘
                        │   (Next.js)     │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Keycloak      │
                        │   (Auth/Users)  │
                        └─────────────────┘
```

## 🛠️ Технологический стек

### Backend

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + TypeORM
- **MQTT**: EMQX с mTLS
- **Auth**: Keycloak + OAuth2 Proxy
- **Validation**: Zod + nestjs-zod
- **Logging**: Pino
- **Testing**: Jest

### IoT Devices

- **MCU**: ESP32 / STM32
- **Security**: ATECC608A secure element
- **Protocol**: MQTT v5 с mTLS
- **OTA**: Secure firmware updates

### DevOps

- **Monorepo**: Nx workspace
- **CI/CD**: GitHub Actions
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **Package Management**: Helm Charts

## 🚦 Быстрый старт

### Предварительные требования

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (или используйте Docker)

### Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd iot-hub

# Установка зависимостей
npm install

# Сборка всех проектов
npx nx run-many -t build

# Запуск development окружения
docker-compose up -d
```

### Запуск разработки

```bash
# Запуск backend в режиме разработки
npx nx serve @iot-hub/backend

# Запуск тестов
npx nx test

# Линтинг кода
npx nx lint
```

## 📋 Основные возможности

### Управление устройствами

- Автоматическая генерация сертификатов
- Привязка устройств через QR-коды
- Мониторинг состояния устройств
- Удаленное управление и настройка

### Безопасность

- Взаимная TLS аутентификация (mTLS)
- Хранение ключей в secure element
- Проверка сертификатов по fingerprint
- ACL для MQTT топиков
- Защита от CSRF/CORS атак

### Масштабируемость

- Microservices architecture
- Horizontal scaling support
- Load balancing ready
- Monitoring & observability

## 📚 Документация

Подробная документация доступна в папке [`docs/`](./docs/):

- [🔧 Конфигурация](./docs/CONFIGURATION.md)
- [🔐 Настройка mTLS](./docs/MTLS_SETUP.md)
- [🚀 Быстрый старт mTLS](./docs/MTLS_QUICK_START.md)
- [📱 Симулятор устройства](./docs/DEVICE_SIMULATOR.md)
- [🛠️ Примеры разработки](./docs/DEVELOPMENT_EXAMPLES.md)
- [🌐 Инфраструктура](./docs/INFRASTRUCTURE.md)
- [🔌 MQTT RPC API](./docs/MQTT_RPC_API.md)

## 🤝 Разработка

### Структура проекта

```text
iot-hub/
├── apps/
│   ├── backend/           # NestJS API сервер
│   └── backend-e2e/       # E2E тесты
├── packages/
│   └── iot-core/          # Общие типы и утилиты
├── tools/
│   └── device-simulator/  # Симулятор IoT устройства
├── docs/                  # Документация
└── certs/                 # Сертификаты для разработки
```

### Команды разработки

```bash
# Сборка всех проектов
npx nx run-many -t build

# Запуск тестов всех проектов
npx nx run-many -t test

# Линтинг всех проектов
npx nx run-many -t lint

# Запуск конкретного проекта
npx nx serve @iot-hub/backend
npx nx test iot-core
npx nx lint device-simulator
```

## 🔒 Безопасность

Система обеспечивает безопасность на нескольких уровнях:

1. **Device Level**: Secure element (ATECC608A) для хранения ключей
2. **Transport Level**: mTLS для всех MQTT соединений
3. **Application Level**: JWT токены и RBAC
4. **Infrastructure Level**: Network policies и secrets management

## 📈 Мониторинг

- **Logging**: Structured logging с Pino
- **Metrics**: Prometheus готовые метрики
- **Health Checks**: Kubernetes health/readiness probes
- **Tracing**: Distributed tracing support

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

## 🆘 Поддержка

- 📧 Email: `support@iot-hub.example.com`
- 💬 Discord: [IoT Hub Community](https://discord.gg/iot-hub)
- 📖 Docs: [Документация](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/user/iot-hub/issues)
