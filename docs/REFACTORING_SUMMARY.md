# Сводка рефакторинга проекта IoT Hub (Июль 2025)

## Основные изменения

Этот документ описывает масштабное рефакторинг проекта IoT Hub, выполненный в июле 2025 года. Рефакторинг затронул структуру проекта, систему сертификатов, MQTT архитектуру и инфраструктуру сборки.

### 1. Структурные изменения

#### Удаленные компоненты

- Полностью удален пакет `packages/iot-core`, включая:
  - Схемы устройств (`src/schemas/devices/`)
  - Типы устройств (`src/types/devices/`)
  - MQTT RPC клиент (`src/infra/mqtt/`)
  - Утилиты RPC (`src/utils/`)

#### Перемещенный функционал

- Функционал из `iot-core` перенесен в специализированные библиотеки под `libs/`:
  - Контракты устройств → `libs/contracts/devices/`
  - MQTT клиент → `libs/shared/src/lib/infra/mqtt/`
  - Утилиты и типы → `libs/shared/src/lib/`

#### Обновленные зависимости

- Обновлены импорты во всех затронутых файлах
- Обновлена конфигурация в `tsconfig.base.json` для отражения новой структуры
- Изменены пути в `package.json` для новой системы алиасов

### 2. Система сертификатов

#### Новая централизованная система хранения

- Использование Docker Volume `iot-hub-certs` для общих сертификатов
- Добавлена документация: `docs/CERTIFICATE_STORAGE.md`
- Скрипт для инициализации хранилища: `scripts/init-certs-volume.sh`

#### Улучшенная генерация сертификатов

- Поддержка PKCS#8 формата для совместимости
- Скрипты для генерации:
  - `generate-ca-certs.sh` - CA сертификаты
  - `scripts/generate-all-certs.sh` - все сертификаты
  - `scripts/generate-server-certs.sh` - серверные сертификаты

#### Решение проблемы с @peculiar/x509

- Документация обходного решения: `docs/PECULIAR_X509_WORKAROUND.md`
- Тестовые скрипты:
  - `test-ca-generation.js`
  - `test-csr-signing.js`
  - `test-key-import.js`

### 3. MQTT Архитектура

#### Строгое разделение подключений

- **Устройства**: Только mTLS на порту 8883
- **Backend**: TCP/1883 (dev) или TLS/8883 без клиентских сертификатов
- Документация: `docs/MQTT_STRICT_SEPARATION.md`

#### Новый MQTT Device клиент

- Реализация в `libs/shared/src/lib/infra/mqtt/device-client.ts`
- Специализированный клиент только для mTLS подключений
- Обязательная аутентификация по сертификатам

### 4. Инфраструктура сборки

#### Docker конфигурация

- Обновлен `docker-compose.yml`
- Добавлен `Dockerfile.backend.dev` для разработки
- Корректное монтирование томов с сертификатами

#### Улучшенная система сборки

- Добавлена конфигурация `tsc-alias` для правильного резолвинга путей
- Обновлены скрипты в `package.json` для сборки и постобработки
- Фиксинг импортов для ESM: `fix-imports.sh`

#### Исправления тестов

- Обновлена конфигурация Jest для бэкенда
- Заменен `apps/backend/jest.config.js` на `apps/backend/jest.config.cjs`

## Как использовать новую систему сертификатов

1. Генерация всех сертификатов:

   ```bash
   ./scripts/generate-all-certs.sh
   ```

2. Инициализация Docker volume:

   ```bash
   ./scripts/init-certs-volume.sh
   ```

3. Запуск системы:

   ```bash
   docker-compose up -d
   ```

## Миграция с предыдущей версии

1. Удалите старые импорты из `@iot-core`:

   ```typescript
   // Было
   import { DeviceType } from '@iot-core/types';

   // Стало
   import { DeviceType } from '@iot-hub/devices';
   ```

2. Замените использование MQTT RPC клиента:

   ```typescript
   // Было
   import { MqttRpcClient } from '@iot-core/infra/mqtt';

   // Стало
   import { RpcClient } from '@iot-hub/shared';
   ```

3. Для устройств с mTLS используйте новый Device клиент:

   ```typescript
   import { MqttDeviceClient } from '@iot-hub/shared';

   const deviceClient = new MqttDeviceClient({
     userId: 'user-id',
     deviceId: 'device-id',
     certificates: {
       ca: fs.readFileSync('ca-cert.pem'),
       cert: fs.readFileSync('client-cert.pem'),
       key: fs.readFileSync('client-key.pem'),
     },
   });
   ```

## Дополнительная документация

- [CERTIFICATE_SETUP.md](/CERTIFICATE_SETUP.md) - Руководство по настройке сертификатов
- [docs/MQTT_STRICT_SEPARATION.md](/docs/MQTT_STRICT_SEPARATION.md) - Архитектура строгого разделения MQTT
- [docs/PECULIAR_X509_WORKAROUND.md](/docs/PECULIAR_X509_WORKAROUND.md) - Обходное решение для проблемы с @peculiar/x509
- [docs/CERTIFICATE_STORAGE.md](/docs/CERTIFICATE_STORAGE.md) - Централизованное хранение сертификатов
