/**
 * Демонстрация работы observability в user-management
 */

import { Logger } from '@nestjs/common';
import {
  ObservabilityConfigService,
  MetricsService,
  TelemetryService,
  LoggingService,
} from '@iot-hub/observability';

async function demonstrateObservability() {
  Logger.log('🔍 Демонстрация Observability в user-management');

  try {
    // Инициализируем конфигурацию
    const configService = new ObservabilityConfigService();
    const config = configService.getConfig();

    Logger.log('✅ Конфигурация observability загружена:', {
      serviceName: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
      telemetryEnabled: config.telemetry.otelEnabled,
      loggingEnabled: config.logging.logLevel,
    });

    // Инициализируем сервисы
    const loggingService = new LoggingService(configService);
    const telemetryService = new TelemetryService(configService);
    const metricsService = new MetricsService(configService);

    // Демонстрируем логирование
    loggingService.info(
      '🚀 User management service started with observability',
      {
        component: 'bootstrap',
        version: config.serviceVersion,
      }
    );

    // Демонстрируем трейсинг
    const span = telemetryService.startSpan('demo.operation', {
      'demo.type': 'observability_test',
      'service.name': config.serviceName,
    });

    // Симулируем некоторую работу
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Демонстрируем метрики
    metricsService.recordUserMetrics({
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      operation: 'demo',
      success: true,
      durationMs: 100,
    });

    span.setStatus({ code: 1 }); // SUCCESS
    span.end();

    loggingService.info(
      '✅ Observability demonstration completed successfully'
    );
    Logger.log('🎉 Observability работает корректно!');
  } catch (error) {
    Logger.error('❌ Ошибка при демонстрации observability:', error);
    throw error;
  }
}

// Запускаем демонстрацию только если это не тест
if (require.main === module) {
  demonstrateObservability()
    .then(() => {
      Logger.log('Демонстрация завершена');
      process.exit(0);
    })
    .catch((error) => {
      Logger.error('Ошибка демонстрации:', error);
      process.exit(1);
    });
}

export { demonstrateObservability };
