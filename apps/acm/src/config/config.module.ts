import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { CommonConfigService } from './common/common-config.service.js';

@Global()
@Module({
  providers: [
    ConfigService,
    {
      provide: CommonConfigService,
      useFactory: () => new CommonConfigService(process.env),
    },
  ],
  exports: [ConfigService, CommonConfigService],
})
export class ConfigModule {}
