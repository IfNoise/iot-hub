import { Injectable } from '@nestjs/common';
import { devicesConfigSchema, DevicesConfig } from './devices-config.schema.js';

@Injectable()
export class DevicesConfigService {
  private readonly config: DevicesConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = devicesConfigSchema.parse({
      deviceTimeoutMs: env.DEVICE_TIMEOUT_MS,
      deviceHeartbeatIntervalMs: env.DEVICE_HEARTBEAT_INTERVAL_MS,
      maxDevicesPerUser: env.MAX_DEVICES_PER_USER,
      certificateValidityDays: env.CERTIFICATE_VALIDITY_DAYS,
      deviceDataRetentionDays: env.DEVICE_DATA_RETENTION_DAYS,
      brokerHost: env.BROKER_HOST,
      brokerSecurePort: env.BROKER_SECURE_PORT,
    });
  }

  get<T extends keyof DevicesConfig>(key: T): DevicesConfig[T] {
    return this.config[key];
  }

  getAll(): DevicesConfig {
    return this.config;
  }

  // Convenience methods
  getTimeoutConfig() {
    return {
      timeout: this.config.deviceTimeoutMs,
      heartbeatInterval: this.config.deviceHeartbeatIntervalMs,
    };
  }

  getLimitsConfig() {
    return {
      maxDevicesPerUser: this.config.maxDevicesPerUser,
    };
  }

  getCertificateConfig() {
    return {
      validityDays: this.config.certificateValidityDays,
    };
  }

  getDataRetentionConfig() {
    return {
      retentionDays: this.config.deviceDataRetentionDays,
    };
  }

  getBrokerConfig() {
    return {
      host: this.config.brokerHost,
      securePort: this.config.brokerSecurePort,
    };
  }
}
