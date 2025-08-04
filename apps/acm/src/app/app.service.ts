import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getServiceInfo() {
    const commonConfig = this.configService.common.getAll();

    return {
      service: commonConfig.serviceName,
      version: commonConfig.serviceVersion,
      environment: commonConfig.nodeEnv,
      status: 'running',
      port: commonConfig.port,
      features: {
        redis: this.configService.isRedisEnabled(),
        kafka: this.configService.isKafkaEnabled(),
        keycloak: this.configService.isKeycloakEnabled(),
        telemetry: this.configService.isOpenTelemetryEnabled(),
      },
      endpoints: {
        users: '/users',
        health: '/health',
        docs: '/api/docs',
        metrics: '/metrics',
      },
    };
  }

  getConfigSummary() {
    // Useful for debugging/development
    if (!this.configService.isDevelopment()) {
      return { message: 'Config details only available in development mode' };
    }

    return {
      environment: this.configService.common.get('nodeEnv'),
      database: {
        type: this.configService.database.get('type'),
        host: this.configService.database.get('host'),
        port: this.configService.database.get('port'),
        name: this.configService.database.get('name'),
      },
      logging: this.configService.getLoggingConfig(),
      redis: this.configService.getRedisConfig(),
      telemetry: this.configService.telemetry.getObservabilityConfig(),
    };
  }
}
