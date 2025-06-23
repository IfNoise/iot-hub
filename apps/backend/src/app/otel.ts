import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Включаем детальное логирование OpenTelemetry только в режиме разработки
if (process.env.NODE_ENV === 'development') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

// Конфигурация OpenTelemetry для IoT Hub Backend
const otelCollectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318';

// Настраиваем переменные окружения для автоматической отправки метрик
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = otelCollectorUrl;
process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `${otelCollectorUrl}/v1/traces`;
process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = `${otelCollectorUrl}/v1/metrics`;
process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `${otelCollectorUrl}/v1/logs`;

// Включаем автоматические метрики
process.env.OTEL_METRICS_EXPORTER = 'otlp';
process.env.OTEL_LOGS_EXPORTER = 'otlp';

// Создаем экспортер для трейсов
const traceExporter = new OTLPTraceExporter({
  url: `${otelCollectorUrl}/v1/traces`,
  headers: {},
  timeoutMillis: 5000,
});

// Создаем процессор для трейсов с батчингом
const spanProcessor = new BatchSpanProcessor(traceExporter, {
  maxQueueSize: 100,
  scheduledDelayMillis: 1000,
  exportTimeoutMillis: 5000,
  maxExportBatchSize: 10,
});

export const otel = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'iot-hub-backend',
  spanProcessors: [spanProcessor],

  instrumentations: [
    getNodeAutoInstrumentations({
      // Отключаем некоторые инструментации для уменьшения шума
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
      // Настраиваем HTTP инструментацию для включения метрик HTTP
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          return req.url?.includes('/health') || req.url?.includes('/favicon') || false;
        },
      },
      // Включаем инструментацию для Express/NestJS с метриками
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      // Включаем инструментацию для PostgreSQL с метриками
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      // Включаем инструментацию для Redis с метриками
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

// Инициализируем OpenTelemetry
export function initializeOpenTelemetry() {
  try {
    console.log('🔍 Инициализация OpenTelemetry...');
    console.log(`📍 Collector URL: ${otelCollectorUrl}`);
    console.log(`📊 Метрики: автоматические (HTTP, Express, PostgreSQL, Redis) + кастомные IoT метрики`);
    console.log(`🔄 Экспорт метрик: каждые ${process.env.OTEL_METRICS_EXPORT_INTERVAL || '10000'}ms`);
    console.log(`🏷️  Сервис: ${process.env.OTEL_SERVICE_NAME || 'iot-hub-backend'}`);
    
    otel.start();
    console.log('✅ OpenTelemetry успешно инициализирован');
    console.log('📈 Доступные типы метрик:');
    console.log('   • HTTP запросы (автоматические)');
    console.log('   • База данных PostgreSQL (автоматические)');
    console.log('   • Redis операции (автоматические)');
    console.log('   • Express middleware (автоматические)');
    console.log('   • IoT устройства и MQTT (кастомные)');
    console.log('   • Аутентификация и ошибки (кастомные)');

    // Добавляем глобальный обработчик ошибок для OpenTelemetry
    process.on('unhandledRejection', (reason) => {
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = (reason as Error).message;
        if (message.includes('ECONNRESET') || message.includes('socket hang up') || message.includes('OTLP')) {
          // Логируем ошибки OTel как JSON для удобства анализа
          console.error(JSON.stringify({
            type: 'otel_connection_error',
            message: message,
            stack: (reason as Error).stack,
            timestamp: new Date().toISOString(),
          }));
          return; // Не падаем из-за ошибок OTel
        }
      }
    });

    // Обработка graceful shutdown
    process.on('SIGTERM', () => {
      otel
        .shutdown()
        .then(() => console.log('🔍 OpenTelemetry успешно завершен'))
        .catch((error) =>
          console.log('❌ Ошибка при завершении OpenTelemetry', error)
        )
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error('❌ Ошибка инициализации OpenTelemetry:', error);
    // Не падаем, если OTel не удалось инициализировать
  }
}
