import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '../../config/config.module';
import { LoggingService } from './logging.service';
import { LogMaintenanceService } from './log-maintenance.service';
import { MetricsExampleService } from './metrics-example.service';
import { HealthController } from '../controllers/health.controller';
import { MetricsController } from '../controllers/metrics.controller';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), ObservabilityModule],
  providers: [LoggingService, LogMaintenanceService, MetricsExampleService],
  controllers: [HealthController, MetricsController],
  exports: [LoggingService, LogMaintenanceService, MetricsExampleService],
})
export class CommonServicesModule implements OnModuleInit {
  constructor(private readonly loggingService: LoggingService) {}

  async onModuleInit() {
    // Ensure log directory is set up when the module initializes
    try {
      await this.loggingService.ensureLogDirectory();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('⚠️ Failed to initialize logging service:', errorMessage);
    }
  }
}
