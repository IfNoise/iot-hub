# Инструкция по настройке сертификатов для IoT Hub

В этом руководстве описывается процесс настройки сертификатов для IoT Hub, включая CA сертификаты, серверные сертификаты для EMQX и использование Docker volume для централизованного хранения сертификатов.

## Известные проблемы и ограничения

> **Важно:** В текущей версии есть проблема с библиотекой `@peculiar/x509` при работе с CA ключами в формате PKCS#8.
> При подписании CSR может возникать ошибка `Too big integer`. Подробнее об обходном решении читайте в [docs/PECULIAR_X509_WORKAROUND.md](docs/PECULIAR_X509_WORKAROUND.md).

## Шаг 1: Генерация сертификатов

Для генерации всех необходимых сертификатов выполните:

```bash
./scripts/generate-all-certs.sh
```

Этот скрипт выполнит:

- Генерацию CA сертификата и ключа (в формате PKCS#8)
- Генерацию серверных сертификатов для EMQX

## Шаг 2: Настройка Docker volume для сертификатов

Инициализируйте Docker volume с сертификатами:

```bash
./scripts/init-certs-volume.sh
```

Этот скрипт скопирует все сертификаты из локальной директории `./certs` в Docker volume `iot-hub-certs`.

## Шаг 3: Запуск системы

Теперь вы можете запустить систему с централизованным хранилищем сертификатов:

```bash
docker-compose up -d
```

## Структура сертификатов

После настройки у вас будет следующая структура:

### Локальная директория `./certs`:

- `ca-cert.pem` - CA сертификат
- `ca-key.pem` - CA ключ в обычном формате
- `ca-key-pkcs8.pem` - CA ключ в формате PKCS#8
- `server-cert.pem` - Серверный сертификат для EMQX
- `server-key.pem` - Серверный ключ для EMQX
- `openssl-ca.cnf` - Конфигурация OpenSSL для CA
- `openssl-server.cnf` - Конфигурация OpenSSL для серверного сертификата

### Docker volume `iot-hub-certs`:

- Те же файлы, что и в локальной директории

### Пути монтирования:

- EMQX: `/opt/emqx/etc/certs` (только чтение)
- Backend: `/workspace/certs` (чтение/запись)

## Проверка настройки

Для проверки правильной настройки сертификатов выполните:

```bash
# Проверка содержимого тома
docker run --rm -v iot-hub-certs:/certs alpine ls -la /certs

# Проверка наличия сертификатов в EMQX
docker exec emqx-mtls ls -la /opt/emqx/etc/certs

# Проверка наличия сертификатов в Backend
docker exec iot-hub-backend ls -la /workspace/certs
```

## Обновление сертификатов

Если вам нужно обновить сертификаты:

1. Генерируйте новые сертификаты:

   ```bash
   ./generate-ca-certs.sh
   ```

2. Обновите Docker volume:

   ```bash
   ./scripts/init-certs-volume.sh
   ```

3. Перезапустите сервисы:
   ```bash
   docker-compose restart emqx iot-backend
   ```

## Дополнительная информация

Дополнительные сведения о централизованном хранении сертификатов можно найти в документации: [CERTIFICATE_STORAGE.md](./docs/CERTIFICATE_STORAGE.md)
