import { Controller, Get } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('test-logging')
  testLogging() {
    this.logger.debug('🐛 Debug test message');
    this.logger.log('ℹ️ Info test message');
    this.logger.warn('⚠️ Warning test message');
    this.logger.error('❌ Error test message');

    return {
      message: 'Logging test completed',
      timestamp: new Date().toISOString(),
      logLevels: ['debug', 'info', 'warn', 'error'],
    };
  }
}
