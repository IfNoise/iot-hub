import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggingService } from './logging.service.js';
import { ConfigService } from '../../config/config.service.js';

@Injectable()
export class LogMaintenanceService {
  private readonly logger = new Logger(LogMaintenanceService.name);

  constructor(
    private readonly loggingService: LoggingService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Daily log cleanup - runs at 2 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyLogCleanup() {
    // Only run in production to avoid disrupting development
    if (!this.configService.isProduction()) {
      return;
    }

    this.logger.log('🌙 Starting daily log maintenance...');

    try {
      await this.loggingService.cleanupOldLogs();
      this.logger.log('✅ Daily log cleanup completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Daily log cleanup failed: ${errorMessage}`);
    }
  }

  /**
   * Weekly log archival - runs every Sunday at 3 AM
   */
  @Cron('0 3 * * 0') // Every Sunday at 3 AM
  async weeklyLogArchival() {
    // Only run in production
    if (!this.configService.isProduction()) {
      return;
    }

    this.logger.log('📦 Starting weekly log archival...');

    try {
      await this.loggingService.archiveLogs(30); // Archive logs older than 30 days
      this.logger.log('✅ Weekly log archival completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Weekly log archival failed: ${errorMessage}`);
    }
  }

  /**
   * Hourly health check - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyHealthCheck() {
    try {
      const health = await this.loggingService.healthCheck();

      if (health.status === 'error') {
        this.logger.error(
          `🚨 Logging system health check failed: ${JSON.stringify(
            health.details
          )}`
        );
      } else if (health.status === 'warning') {
        this.logger.warn(
          `⚠️ Logging system health warning: ${JSON.stringify(health.details)}`
        );
      } else {
        this.logger.debug('✅ Logging system health check passed');
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Health check failed: ${errorMessage}`);
    }
  }
}
