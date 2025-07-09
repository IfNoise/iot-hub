import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { AppService } from './app.service.js';
import { contracts } from '@iot-hub/contracts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @TsRestHandler(contracts.health.checkHealth)
  getData() {
    return tsRestHandler(contracts.health.checkHealth, async () => {
      const data = this.appService.getData();
      return {
        status: 200 as const,
        body: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          services: {
            app: {
              status: 'healthy',
              details: { message: data.message },
            },
          },
        },
      };
    });
  }
}
