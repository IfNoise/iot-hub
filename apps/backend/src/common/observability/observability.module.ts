import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { OtelService } from './otel.service';
import { MetricsService } from './metrics.service';
import { TelemetryService } from './telemetry.service';

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
