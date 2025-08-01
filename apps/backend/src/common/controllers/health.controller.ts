import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { LoggingService } from '../services/logging.service.js';
import { KafkaHealthIndicator } from '../../infrastructure/kafka/kafka-health.indicator.js';
import { healthContract } from '@iot-hub/contracts';

@ApiTags('System Health')
@Controller()
export class HealthController {
  constructor(
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
    private readonly loggingService: LoggingService,
    private readonly kafkaHealthIndicator: KafkaHealthIndicator
  ) {}

  @TsRestHandler(healthContract.checkHealth)
  async checkHealth() {
    return tsRestHandler(healthContract.checkHealth, async () => {
      this.logger.info('🔍 Checking overall system health...');

      const services: Record<
        string,
        {
          status: 'healthy' | 'degraded' | 'unhealthy';
          details?: Record<string, unknown>;
        }
      > = {};

      // Check logging service
      try {
        const loggingHealth = await this.loggingService.healthCheck();
        services.logging = {
          status:
            loggingHealth.status === 'healthy'
              ? ('healthy' as const)
              : ('degraded' as const),
          details: loggingHealth.details as Record<string, unknown>,
        };
      } catch (error) {
        services.logging = {
          status: 'unhealthy' as const,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }

      // Check Kafka service
      try {
        const kafkaHealth = await this.kafkaHealthIndicator.isHealthy();
        services.kafka = {
          status: kafkaHealth.kafka?.status ? 'healthy' : 'unhealthy',
          details: kafkaHealth.kafka || {},
        };
      } catch (error) {
        services.kafka = {
          status: 'unhealthy' as const,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }

      // Determine overall status
      const hasUnhealthy = Object.values(services).some(
        (s) => s.status === 'unhealthy'
      );
      const hasDegraded = Object.values(services).some(
        (s) => s.status === 'degraded'
      );

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (hasUnhealthy) {
        overallStatus = 'unhealthy';
      } else if (hasDegraded) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      return {
        status: 200 as const,
        body: {
          status: overallStatus,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          services,
        },
      };
    });
  }

  @TsRestHandler(healthContract.checkLoggingHealth)
  async checkLoggingHealth() {
    return tsRestHandler(healthContract.checkLoggingHealth, async () => {
      this.logger.info('🔍 Checking logging system health...');

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
      this.logger.info('📊 Retrieving log statistics...');

      const rawStats = await this.loggingService.getLogFileStats();
      // Ensure stats is always a Record<string, unknown>, never null
      const stats: Record<string, unknown> = rawStats || {};

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
    this.logger.info('🧹 Triggering log cleanup...');

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
