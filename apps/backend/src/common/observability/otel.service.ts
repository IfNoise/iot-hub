import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '../../config/config.service.js';
import { OpenTelemetryConfig } from './types.js';

@Injectable()
export class OtelService implements OnModuleInit, OnModuleDestroy {
  private config: OpenTelemetryConfig;

  constructor(
    @InjectPinoLogger(OtelService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService
  ) {
    this.config = this.configService.getOpenTelemetryConfig();
  }

  async onModuleInit() {
    // OpenTelemetry уже инициализирован в instrumentation.ts
    // Этот сервис предоставляет конфигурацию и утилиты
    this.logger.info(
      '📊 OtelService: конфигурация загружена из ConfigService, SDK уже инициализирован'
    );
    this.logger.info(`📍 Collector URL: ${this.config.collectorUrl}`);
    this.logger.info(`🏷️  Сервис: ${this.config.serviceName}`);
    this.logger.info(
      `📊 Метрики: ${this.config.metrics.enabled ? 'включены' : 'отключены'}`
    );
    this.logger.info(
      `🔄 Трейсы: ${this.config.tracing.enabled ? 'включены' : 'отключены'}`
    );
    this.logger.info(
      `📝 Логи: ${this.config.logging.enabled ? 'включены' : 'отключены'}`
    );
  }

  async onModuleDestroy() {
    // Graceful shutdown обрабатывается в instrumentation.ts
    this.logger.info('📊 OtelService: завершение работы');
  }

  getConfig(): OpenTelemetryConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    // Предполагаем, что всегда инициализирован через instrumentation.ts
    return this.config.enabled;
  }

  getEndpoints() {
    return this.config.endpoints;
  }

  getServiceName(): string {
    return this.config.serviceName;
  }

  getCollectorUrl(): string {
    return this.config.collectorUrl;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isTracingEnabled(): boolean {
    return this.config.enabled && this.config.tracing.enabled;
  }

  isMetricsEnabled(): boolean {
    return this.config.enabled && this.config.metrics.enabled;
  }

  isLoggingEnabled(): boolean {
    return this.config.enabled && this.config.logging.enabled;
  }

  getResourceAttributes(): Record<string, string> {
    return { ...this.config.resourceAttributes };
  }

  async shutdown() {
    // Заглушка для совместимости
    this.logger.info(
      '📊 OtelService: shutdown вызван (обрабатывается в instrumentation.ts)'
    );
  }
}
