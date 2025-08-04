import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('service')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get service information' })
  @ApiResponse({ status: 200, description: 'Service information' })
  getData() {
    return this.appService.getServiceInfo();
  }

  @Get('config')
  @ApiOperation({
    summary: 'Get configuration summary (development only)',
    description:
      'Returns configuration details in development environment only',
  })
  @ApiResponse({ status: 200, description: 'Configuration summary' })
  getConfig() {
    return this.appService.getConfigSummary();
  }

  @Get('env-test')
  @ApiOperation({
    summary: 'Test environment variables loading',
    description: 'Check if .env file is properly loaded',
  })
  @ApiResponse({ status: 200, description: 'Environment test results' })
  testEnv() {
    return {
      testEnvLoaded: process.env.TEST_ENV_LOADED,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      databaseHost: process.env.DATABASE_HOST,
      envFileDetection: process.env.TEST_ENV_LOADED === 'true_from_env_file',
    };
  }
}
