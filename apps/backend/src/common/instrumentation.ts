// OpenTelemetry Instrumentation Bootstrap
// This file must be imported before any other modules to ensure proper instrumentation

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { envConfigSchema } from '../config/config.schema';

// Парсим конфигурацию из environment переменных
const envConfig = envConfigSchema.parse(process.env);

// Включаем детальное логирование OpenTelemetry если включен debug режим
const debugMode = envConfig.OTEL_DEBUG || envConfig.NODE_ENV === 'development';
if (debugMode) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

// Проверяем, включен ли OpenTelemetry
if (!envConfig.OTEL_ENABLED) {
  console.log('📊 OpenTelemetry отключен через конфигурацию OTEL_ENABLED=false');
} else {
  // Настраиваем переменные окружения для автоматической отправки метрик
  const collectorUrl = envConfig.OTEL_COLLECTOR_URL;
  const tracesEndpoint = envConfig.OTEL_COLLECTOR_TRACES_ENDPOINT || `${collectorUrl}/v1/traces`;
  const metricsEndpoint = envConfig.OTEL_COLLECTOR_METRICS_ENDPOINT || `${collectorUrl}/v1/metrics`;
  const logsEndpoint = envConfig.OTEL_COLLECTOR_LOGS_ENDPOINT || `${collectorUrl}/v1/logs`;

  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = collectorUrl;
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = tracesEndpoint;
  process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = metricsEndpoint;
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = logsEndpoint;

  // Включаем автоматические метрики и логи если включены в конфиге
  if (envConfig.OTEL_ENABLE_METRICS) {
    process.env.OTEL_METRICS_EXPORTER = 'otlp';
  }
  if (envConfig.OTEL_ENABLE_LOGGING) {
    process.env.OTEL_LOGS_EXPORTER = 'otlp';
  }

  // Создаем экспортер для трейсов только если трейсинг включен
  let spanProcessors: BatchSpanProcessor[] = [];
  if (envConfig.OTEL_ENABLE_TRACING) {
    const traceExporter = new OTLPTraceExporter({
      url: tracesEndpoint,
      headers: {},
      timeoutMillis: envConfig.OTEL_EXPORTER_TIMEOUT,
    });

    const spanProcessor = new BatchSpanProcessor(traceExporter, {
      maxQueueSize: envConfig.OTEL_MAX_QUEUE_SIZE,
      scheduledDelayMillis: envConfig.OTEL_BATCH_TIMEOUT,
      exportTimeoutMillis: envConfig.OTEL_EXPORTER_TIMEOUT,
      maxExportBatchSize: envConfig.OTEL_BATCH_SIZE,
    });

    spanProcessors = [spanProcessor];
  }

  // Парсим resource attributes
  const parseResourceAttributes = (attributesString?: string): Record<string, string> => {
    const baseAttributes = {
      'service.name': envConfig.OTEL_SERVICE_NAME,
      'service.version': envConfig.OTEL_SERVICE_VERSION,
      'environment': envConfig.NODE_ENV,
      'deployment.environment': envConfig.NODE_ENV,
    };

    if (!attributesString) {
      return baseAttributes;
    }

    const customAttributes: Record<string, string> = {};
    attributesString.split(',').forEach(pair => {
      const [key, value] = pair.trim().split('=');
      if (key && value) {
        customAttributes[key.trim()] = value.trim();
      }
    });

    return { ...baseAttributes, ...customAttributes };
  };

  const resourceAttributes = parseResourceAttributes(envConfig.OTEL_RESOURCE_ATTRIBUTES);

  // Настраиваем ресурсы через environment переменные
  const resourceAttributesString = Object.entries(resourceAttributes)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributesString;

  // Создаем и инициализируем SDK
  const sdk = new NodeSDK({
    serviceName: envConfig.OTEL_SERVICE_NAME,
    spanProcessors: spanProcessors,
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
            return (
              req.url?.includes('/health') ||
              req.url?.includes('/favicon') ||
              false
            );
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

  try {
    console.log('🔍 Инициализация OpenTelemetry из конфигурации...');
    console.log(`📍 Collector URL: ${collectorUrl}`);
    console.log(`🏷️  Сервис: ${envConfig.OTEL_SERVICE_NAME} v${envConfig.OTEL_SERVICE_VERSION}`);
    console.log(`📊 Метрики: ${envConfig.OTEL_ENABLE_METRICS ? 'включены' : 'отключены'}`);
    console.log(`🔄 Трейсы: ${envConfig.OTEL_ENABLE_TRACING ? 'включены' : 'отключены'}`);
    console.log(`📝 Логи: ${envConfig.OTEL_ENABLE_LOGGING ? 'включены' : 'отключены'}`);
    console.log(`🐛 Debug: ${debugMode ? 'включен' : 'отключен'}`);
    
    sdk.start();
    
    console.log('✅ OpenTelemetry успешно инициализирован из конфигурации');
    console.log('📈 Доступные типы метрик:');
    console.log('   • HTTP запросы (автоматические)');
    console.log('   • База данных PostgreSQL (автоматические)');
    console.log('   • Redis операции (автоматические)');
    console.log('   • Express middleware (автоматические)');
    console.log('   • IoT устройства и MQTT (кастомные)');
    console.log('   • Аутентификация и ошибки (кастомные)');

    // Обработка graceful shutdown
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('🔍 OpenTelemetry успешно завершен'))
        .catch((error) =>
          console.log('❌ Ошибка при завершении OpenTelemetry', error)
        )
        .finally(() => process.exit(0));
    });

    // Добавляем глобальный обработчик ошибок для OpenTelemetry
    process.on('unhandledRejection', (reason) => {
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = (reason as Error).message;
        if (
          message.includes('ECONNRESET') ||
          message.includes('socket hang up') ||
          message.includes('OTLP')
        ) {
          // Логируем ошибки OTel как JSON для удобства анализа
          if (debugMode) {
            console.error(
              JSON.stringify({
                type: 'otel_connection_error',
                message: message,
                stack: (reason as Error).stack,
                timestamp: new Date().toISOString(),
              })
            );
          }
          return; // Не падаем из-за ошибок OTel
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации OpenTelemetry:', error);
    // Не падаем, если OTel не удалось инициализировать
  }
}

// Экспортируем функцию инициализации для совместимости
export const initializeOpenTelemetry = () => {
  console.log('📊 OpenTelemetry инициализация управляется из instrumentation.ts');
};
