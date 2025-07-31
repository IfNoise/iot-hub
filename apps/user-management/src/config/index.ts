// Main config
export { ConfigService } from './config.service.js';
export { ConfigModule } from './config.module.js';
export type { AppConfig, EnvConfig } from './config.schema.js';

// Domain configs
export { CommonConfigService } from './common/common-config.service.js';
export type { CommonConfig } from './common/common-config.schema.js';

export { AuthConfigService } from './auth/auth-config.service.js';
export type { AuthConfig } from './auth/auth-config.schema.js';

export { DatabaseConfigService } from './database/database-config.service.js';
export type {
  DatabaseConfig,
  DrizzleConnectionOptions,
  DatabaseEnvironmentConfig,
} from './database/database-config.schema.js';

export { TelemetryConfigService } from './telemetry/telemetry-config.service.js';
export type {
  TelemetryConfig,
  OpenTelemetryConfig,
} from './telemetry/telemetry-config.schema.js';

export { KafkaConfigService } from './kafka/kafka-config.service.js';
export type { KafkaConfig } from './kafka/kafka-config.schema.js';
