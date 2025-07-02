import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { OpenTelemetryConfig } from './types.js';

@Injectable()
export class OtelService implements OnModuleInit, OnModuleDestroy {
  private config: OpenTelemetryConfig;
  private readonly logger = new Logger(OtelService.name);

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getOpenTelemetryConfig();
  }

  async onModuleInit() {
    // OpenTelemetry уже инициализирован в instrumentation.ts
    // Этот сервис предоставляет конфигурацию и утилиты
    this.logger.log(
      '📊 OtelService: конфигурация загружена из ConfigService, SDK уже инициализирован'
    );
    this.logger.log(`📍 Collector URL: ${this.config.collectorUrl}`);
    this.logger.log(`🏷️  Сервис: ${this.config.serviceName}`);
    this.logger.log(
      `📊 Метрики: ${this.config.metrics.enabled ? 'включены' : 'отключены'}`
    );
    this.logger.log(
      `🔄 Трейсы: ${this.config.tracing.enabled ? 'включены' : 'отключены'}`
    );
    this.logger.log(
      `📝 Логи: ${this.config.logging.enabled ? 'включены' : 'отключены'}`
    );
  }

  async onModuleDestroy() {
    // Graceful shutdown обрабатывается в instrumentation.ts
    this.logger.log('📊 OtelService: завершение работы');
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
    this.logger.log(
      '📊 OtelService: shutdown вызван (обрабатывается в instrumentation.ts)'
    );
  }
}
