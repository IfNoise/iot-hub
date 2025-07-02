import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module.js';
import { OtelService } from './otel.service.js';
import { MetricsService } from './metrics.service.js';
import { TelemetryService } from './telemetry.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OtelService,
    MetricsService,
    TelemetryService,
  ],
  exports: [
    OtelService,
    MetricsService,
    TelemetryService,
  ],
})
export class ObservabilityModule {}
