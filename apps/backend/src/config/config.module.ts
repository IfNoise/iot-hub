import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service';

// Import domain config services
import { CommonConfigService } from '../common/config/common-config.service';
import { AuthConfigService } from '../auth/config/auth-config.service';
import { DatabaseConfigService } from '../database/config/database-config.service';
import { MqttConfigService } from '../mqtt/config/mqtt-config.service';
import { TelemetryConfigService } from '../common/config/telemetry-config.service';
import { DevicesConfigService } from '../devices/config/devices-config.service';
import { UsersConfigService } from '../users/config/users-config.service';

@Global()
@Module({
  providers: [
    ConfigService,
    // Domain config services are instantiated within ConfigService
    // but we can also provide them separately if needed
    {
      provide: CommonConfigService,
      useFactory: (configService: ConfigService) => configService.common,
      inject: [ConfigService],
    },
    {
      provide: AuthConfigService,
      useFactory: (configService: ConfigService) => configService.auth,
      inject: [ConfigService],
    },
    {
      provide: DatabaseConfigService,
      useFactory: (configService: ConfigService) => configService.database,
      inject: [ConfigService],
    },
    {
      provide: MqttConfigService,
      useFactory: (configService: ConfigService) => configService.mqtt,
      inject: [ConfigService],
    },
    {
      provide: TelemetryConfigService,
      useFactory: (configService: ConfigService) => configService.telemetry,
      inject: [ConfigService],
    },
    {
      provide: DevicesConfigService,
      useFactory: (configService: ConfigService) => configService.devices,
      inject: [ConfigService],
    },
    {
      provide: UsersConfigService,
      useFactory: (configService: ConfigService) => configService.users,
      inject: [ConfigService],
    },
  ],
  exports: [
    ConfigService,
    CommonConfigService,
    AuthConfigService,
    DatabaseConfigService,
    MqttConfigService,
    TelemetryConfigService,
    DevicesConfigService,
    UsersConfigService,
  ],
})
export class ConfigModule {}
