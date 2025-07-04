# Настройка системы мониторинга для IoT Hub

В данном документе описана настройка системы мониторинга (Observability) для приложения IoT Hub.

## Компоненты системы мониторинга

Система мониторинга состоит из следующих компонентов:

1. **OpenTelemetry Collector** - сбор и маршрутизация метрик, логов и трейсов
2. **Loki** - система для хранения и анализа логов
3. **Prometheus** - система для хранения и запроса метрик
4. **Tempo** - система для хранения и анализа трейсов
5. **Grafana** - визуализация всех типов данных

## Порты и endpoints

- **OTEL Collector**:
  - 4317 (gRPC)
  - 4318 (HTTP)
- **Grafana**: 3050 → 3000
- **Loki**: 3100
- **Tempo**:
  - 3200 (UI)
  - 4319 (gRPC)
  - 4320 → 4318 (HTTP)
- **VictoriaMetrics**: 8428

## Запуск системы мониторинга

Система мониторинга запускается с помощью отдельного docker-compose файла:

```bash
docker-compose -f docker-compose.loki.yml up -d
```

## Настройка приложения

Для отправки данных в систему мониторинга приложение должно быть настроено соответствующим образом:

### Настройка OpenTelemetry

В файле `.env` установлены следующие переменные:

```properties
OTEL_ENABLED=true
OTEL_SERVICE_NAME=iot-hub-backend
OTEL_SERVICE_VERSION=1.0.0
OTEL_COLLECTOR_URL=http://localhost:4318
OTEL_ENABLE_TRACING=true
OTEL_ENABLE_METRICS=true
OTEL_ENABLE_LOGGING=true
```

### Настройка Loki для логирования

```properties
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100
LOKI_LABELS=service=iot-hub-backend,version=1.0.0
LOKI_TIMEOUT=30000
LOKI_SILENCE_ERRORS=true
```

## Доступ к Grafana

Grafana доступна по адресу [http://localhost:3050](http://localhost:3050) с логином admin/admin.

## Дашборды

В Grafana настроены следующие дашборды:

1. **IoT Hub Overview** - общий обзор системы
2. **IoT Hub Logs** - логи приложения
3. **IoT Hub Metrics** - метрики приложения
4. **IoT Hub Traces** - трейсы запросов

## Решение проблем

### Не поступают логи в Loki

- Проверьте, что `LOKI_ENABLED=true` и указан правильный `LOKI_URL`
- Убедитесь, что формат меток корректный: `service=iot-hub-backend`, а не `service:iot-hub-backend`

### Не поступают метрики в Prometheus

- Проверьте, что `OTEL_ENABLED=true` и `OTEL_ENABLE_METRICS=true`
- Убедитесь, что указан правильный `OTEL_COLLECTOR_URL`

### Не поступают трейсы в Tempo

- Проверьте, что `OTEL_ENABLED=true` и `OTEL_ENABLE_TRACING=true`
- Убедитесь, что указан правильный `OTEL_COLLECTOR_URL`
