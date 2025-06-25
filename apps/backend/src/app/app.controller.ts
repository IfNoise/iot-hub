import { Controller, Logger } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { AppService } from './app.service';
import { appContract } from '@iot-hub/contracts';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @TsRestHandler(appContract.getData)
  getData() {
    return tsRestHandler(appContract.getData, async () => {
      const data = this.appService.getData();
      return {
        status: 200 as const,
        body: {
          message: data.message,
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
        },
      };
    });
  }

  @TsRestHandler(appContract.testLogging)
  testLogging() {
    return tsRestHandler(appContract.testLogging, async () => {
      this.logger.debug('🐛 Debug test message');
      this.logger.log('ℹ️ Info test message');
      this.logger.warn('⚠️ Warning test message');
      this.logger.error('❌ Error test message');

      return {
        status: 200 as const,
        body: {
          message: 'Logging test completed',
          timestamp: new Date().toISOString(),
          logLevels: ['debug', 'info', 'warn', 'error'],
        },
      };
    });
  }
}
