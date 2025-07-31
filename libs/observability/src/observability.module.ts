import { Module, Global } from '@nestjs/common';
import { ObservabilityConfigService } from './services/observability-config.service.js';
import { OtelService } from './services/otel.service.js';
import { MetricsService } from './services/metrics.service.js';
import { TelemetryService } from './services/telemetry.service.js';
import { LoggingService } from './services/logging.service.js';

/**
 * Global observability module
 * Предоставляет единую точку доступа ко всем сервисам observability
 */
@Global()
@Module({
  providers: [
    ObservabilityConfigService,
    {
      provide: LoggingService,
      useFactory: (configService: ObservabilityConfigService) => {
        const loggingConfig = configService.getLoggingConfig();
        return new LoggingService(loggingConfig);
      },
      inject: [ObservabilityConfigService],
    },
    {
      provide: TelemetryService,
      useFactory: (configService: ObservabilityConfigService) => {
        return new TelemetryService(configService);
      },
      inject: [ObservabilityConfigService],
    },
    {
      provide: MetricsService,
      useFactory: (configService: ObservabilityConfigService) => {
        return new MetricsService(configService);
      },
      inject: [ObservabilityConfigService],
    },
    {
      provide: OtelService,
      useFactory: (configService: ObservabilityConfigService) => {
        const telemetryConfig = configService.getTelemetryConfig();
        return new OtelService(telemetryConfig);
      },
      inject: [ObservabilityConfigService],
    },
  ],
  exports: [
    ObservabilityConfigService,
    OtelService,
    MetricsService,
    TelemetryService,
    LoggingService,
  ],
})
export class ObservabilityModule {}
