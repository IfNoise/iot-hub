import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggingService } from '../services/logging.service';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly loggingService: LoggingService) {}

  @Get('logging')
  @ApiOperation({ summary: 'Check logging system health' })
  @ApiResponse({
    status: 200,
    description: 'Logging system health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'warning', 'error'] },
        details: { type: 'object' },
        timestamp: { type: 'string' },
      },
    },
  })
  async checkLoggingHealth() {
    this.logger.log('🔍 Checking logging system health...');

    const healthCheck = await this.loggingService.healthCheck();

    return {
      ...healthCheck,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('logs/stats')
  @ApiOperation({ summary: 'Get log file statistics' })
  @ApiResponse({
    status: 200,
    description: 'Log file statistics',
  })
  async getLogStats() {
    this.logger.log('📊 Retrieving log statistics...');

    const stats = await this.loggingService.getLogFileStats();

    return {
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('logs/cleanup')
  @ApiOperation({ summary: 'Trigger log cleanup (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Log cleanup completed',
  })
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
