import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { LoggingService } from '../services/logging.service';
import { healthContract } from '@iot-hub/contracts';

@ApiTags('System Health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly loggingService: LoggingService) {}

  @TsRestHandler(healthContract.checkLoggingHealth)
  async checkLoggingHealth() {
    return tsRestHandler(healthContract.checkLoggingHealth, async () => {
      this.logger.log('🔍 Checking logging system health...');

      const healthCheck = await this.loggingService.healthCheck();

      return {
        status: 200 as const,
        body: {
          ...healthCheck,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  @TsRestHandler(healthContract.getLogStats)
  async getLogStats() {
    return tsRestHandler(healthContract.getLogStats, async () => {
      this.logger.log('📊 Retrieving log statistics...');

      const stats = await this.loggingService.getLogFileStats();

      return {
        status: 200 as const,
        body: {
          stats,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  // Дополнительный метод для очистки логов (без TS-REST контракта)
  async triggerLogCleanup() {
    this.logger.log('🧹 Triggering log cleanup...');

    try {
      await this.loggingService.cleanupOldLogs();
      return {
        status: 'success',
        message: 'Log cleanup completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Log cleanup failed: ${errorMessage}`);
      return {
        status: 'error',
        message: `Log cleanup failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
