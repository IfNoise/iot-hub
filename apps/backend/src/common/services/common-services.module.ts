import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '../../config/config.module';
import { LoggingService } from './logging.service';
import { LogMaintenanceService } from './log-maintenance.service';
import { HealthController } from '../controllers/health.controller';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [LoggingService, LogMaintenanceService],
  controllers: [HealthController],
  exports: [LoggingService, LogMaintenanceService],
})
export class CommonServicesModule implements OnModuleInit {
  constructor(private readonly loggingService: LoggingService) {}

  async onModuleInit() {
    // Ensure log directory is set up when the module initializes
    try {
      await this.loggingService.ensureLogDirectory();
    } catch (error: Error | unknown) {
      console.error('⚠️ Failed to initialize logging service:', error.message);
    }
  }
}
