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
const otelCollectorUrl =
  process.env.OTEL_COLLECTOR_URL || 'http://localhost:4320';

// Принудительно устанавливаем переменные окружения для OpenTelemetry
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = otelCollectorUrl;
process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `${otelCollectorUrl}/v1/traces`;
process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = `${otelCollectorUrl}/v1/metrics`;

// Создаем ресурс с метаданными сервиса
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'iot-hub-backend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'iot-hub',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Создаем экспортер для трейсов с настройками timeout и retry
const traceExporter = new OTLPTraceExporter({
  url: `${otelCollectorUrl}/v1/traces`,
  headers: {},
  timeoutMillis: 5000, // 5 секунд timeout
});

// Создаем экспортер для метрик
const metricExporter = new OTLPMetricExporter({
  url: `${otelCollectorUrl}/v1/metrics`,
  headers: {},
  timeoutMillis: parseInt(process.env.OTEL_METRICS_EXPORT_TIMEOUT || '5000'),
});

// Создаем читатель метрик с периодическим экспортом
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: parseInt(process.env.OTEL_METRICS_EXPORT_INTERVAL || '10000'), // 10 секунд
  exportTimeoutMillis: parseInt(process.env.OTEL_METRICS_EXPORT_TIMEOUT || '5000'),
});

// Создаем экспортер с настройками timeout и retry
const traceExporter = new OTLPTraceExporter({
  url: `${otelCollectorUrl}/v1/traces`,
  headers: {},
  timeoutMillis: 5000, // 5 секунд timeout
});

// Создаем процессор с батчингом для лучшей производительности
const spanProcessor = new BatchSpanProcessor(traceExporter, {
  maxQueueSize: 100,
  scheduledDelayMillis: 1000, // Отправка каждую секунду
  exportTimeoutMillis: 5000, // Timeout экспорта
  maxExportBatchSize: 10, // Размер батча
});

export const otel = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'iot-hub-backend',
  resource: resource,

  spanProcessors: [spanProcessor], // Исправили на множественное число

  metricReader: metricReader, // Добавляем читатель метрик

  instrumentations: [
    getNodeAutoInstrumentations({
      // Отключаем некоторые инструментации, которые могут создавать много шума
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
      // Ограничиваем HTTP инструментацию
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // Игнорируем health check и статичные ресурсы
          return req.url?.includes('/health') || req.url?.includes('/favicon') || false;
        },
      },
    }),
  ],
});

// Инициализируем OpenTelemetry
export function initializeOpenTelemetry() {
  try {
    console.log('🔍 Инициализация OpenTelemetry...');
    console.log(`📍 Collector URL: ${otelCollectorUrl}`);
    
    otel.start();
    console.log('✅ OpenTelemetry успешно инициализирован');

    // Добавляем глобальный обработчик ошибок для OpenTelemetry
    process.on('unhandledRejection', (reason) => {
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = (reason as Error).message;
        if (message.includes('ECONNRESET') || message.includes('socket hang up')) {
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
