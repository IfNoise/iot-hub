/**
 * OpenTelemetry Instrumentation Bootstrap для микросервисов
 * Этот файл должен импортироваться первым в main.ts для правильной инструментации
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { observabilityEnvSchema } from '../config/observability.schema.js';

/**
 * Инициализировать OpenTelemetry для микросервиса
 * Автоматически определяет имя сервиса из package.json
 */
export function initializeOpenTelemetry(): void {
  try {
    // Парсим конфигурацию из environment переменных
    const envConfig = observabilityEnvSchema.parse(process.env);

    // Включаем детальное логирование OpenTelemetry если включен debug режим
    const debugMode =
      envConfig.OTEL_DEBUG || envConfig.NODE_ENV === 'development';
    if (debugMode) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    // Проверяем, включен ли OpenTelemetry
    if (!envConfig.OTEL_ENABLED) {
      console.log(
        '📊 OpenTelemetry отключен через конфигурацию OTEL_ENABLED=false'
      );
      return;
    }

    // Автоматически определяем имя сервиса
    const serviceName = determineServiceName(envConfig.SERVICE_NAME);
    const serviceVersion = determineServiceVersion(envConfig.SERVICE_VERSION);

    // Настраиваем переменные окружения для автоматической отправки метрик
    const collectorUrl = envConfig.OTEL_COLLECTOR_URL;
    const tracesEndpoint =
      envConfig.OTEL_COLLECTOR_TRACES_ENDPOINT || `${collectorUrl}/v1/traces`;
    const metricsEndpoint =
      envConfig.OTEL_COLLECTOR_METRICS_ENDPOINT || `${collectorUrl}/v1/metrics`;
    const logsEndpoint =
      envConfig.OTEL_COLLECTOR_LOGS_ENDPOINT || `${collectorUrl}/v1/logs`;

    // Отладочный вывод для эндпоинтов
    console.log('📊 OTEL Endpoints:');
    console.log(`📈 Collector URL: ${collectorUrl}`);
    console.log(`🔄 Трейсы: ${tracesEndpoint}`);
    console.log(`📊 Метрики: ${metricsEndpoint}`);
    console.log(`📝 Логи: ${logsEndpoint}`);

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
    const resourceAttributes = parseResourceAttributes(
      envConfig.OTEL_RESOURCE_ATTRIBUTES,
      serviceName,
      serviceVersion,
      envConfig.NODE_ENV
    );

    // Настраиваем ресурсы через environment переменные
    const resourceAttributesString = Object.entries(resourceAttributes)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributesString;

    // Создаем и инициализируем SDK
    const sdk = new NodeSDK({
      serviceName: serviceName,
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
          // Настраиваем HTTP инструментацию
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
          // Включаем инструментацию для Express/NestJS
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          // Включаем инструментацию для PostgreSQL
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
          // Включаем инструментацию для Redis
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    console.log('🔍 Инициализация OpenTelemetry из конфигурации...');
    console.log(`📍 Collector URL: ${collectorUrl}`);
    console.log(`🏷️  Сервис: ${serviceName} v${serviceVersion}`);
    console.log(
      `📊 Метрики: ${envConfig.OTEL_ENABLE_METRICS ? 'включены' : 'отключены'}`
    );
    console.log(
      `🔄 Трейсы: ${envConfig.OTEL_ENABLE_TRACING ? 'включены' : 'отключены'}`
    );
    console.log(
      `📝 Логи: ${envConfig.OTEL_ENABLE_LOGGING ? 'включены' : 'отключены'}`
    );
    console.log(`🐛 Debug: ${debugMode ? 'включен' : 'отключен'}`);

    sdk.start();

    console.log('✅ OpenTelemetry успешно инициализирован');
    console.log('📈 Доступные типы метрик:');
    console.log('   • HTTP запросы (автоматические)');
    console.log('   • База данных (автоматические)');
    console.log('   • Redis операции (автоматические)');
    console.log('   • Express middleware (автоматические)');
    console.log('   • Кастомные метрики микросервиса');

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

    // Глобальный обработчик ошибок для OpenTelemetry
    process.on('unhandledRejection', (reason) => {
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = (reason as Error).message;
        if (
          message.includes('ECONNRESET') ||
          message.includes('socket hang up') ||
          message.includes('OTLP')
        ) {
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

/**
 * Определить имя сервиса из конфигурации или package.json
 */
function determineServiceName(configServiceName?: string): string {
  if (configServiceName) {
    return configServiceName;
  }

  try {
    const packageJson = JSON.parse(
      require('fs').readFileSync('./package.json', 'utf8')
    );
    return packageJson.name || 'unknown-microservice';
  } catch {
    return 'unknown-microservice';
  }
}

/**
 * Определить версию сервиса из конфигурации или package.json
 */
function determineServiceVersion(configServiceVersion?: string): string {
  if (configServiceVersion) {
    return configServiceVersion;
  }

  try {
    const packageJson = JSON.parse(
      require('fs').readFileSync('./package.json', 'utf8')
    );
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Парсить resource attributes
 */
function parseResourceAttributes(
  attributesString?: string,
  serviceName?: string,
  serviceVersion?: string,
  environment?: string
): Record<string, string> {
  const baseAttributes = {
    'service.name': serviceName || 'unknown-service',
    'service.version': serviceVersion || '1.0.0',
    environment: environment || 'development',
    'deployment.environment': environment || 'development',
  };

  if (!attributesString) {
    return baseAttributes;
  }

  const customAttributes: Record<string, string> = {};
  attributesString.split(',').forEach((pair) => {
    const [key, value] = pair.trim().split('=');
    if (key && value) {
      customAttributes[key.trim()] = value.trim();
    }
  });

  return { ...baseAttributes, ...customAttributes };
}
