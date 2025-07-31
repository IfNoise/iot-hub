/**
 * @iot-hub/observability
 * Unified observability library for IoT Hub microservices
 */

// Export module
export { ObservabilityModule } from './observability.module.js';

// Export services
export { ObservabilityConfigService } from './services/observability-config.service.js';
export { OtelService } from './services/otel.service.js';
export { MetricsService } from './services/metrics.service.js';
export { TelemetryService } from './services/telemetry.service.js';
export { LoggingService } from './services/logging.service.js';

// Export configuration schemas
export {
  observabilityConfigSchema,
  observabilityEnvSchema,
  type ObservabilityConfig,
  type ObservabilityEnvConfig,
} from './config/observability.schema.js';

export {
  loggingConfigSchema,
  type LoggingConfig,
} from './config/logging.schema.js';

export {
  telemetryConfigSchema,
  type TelemetryConfig,
} from './config/telemetry.schema.js';

// Export types
export * from './types/index.js';

// Export instrumentation
export { initializeOpenTelemetry } from './instrumentation/otel-instrumentation.js';

// Re-export commonly used OpenTelemetry types for convenience
export type { Span } from '@opentelemetry/api';
export { SpanStatusCode } from '@opentelemetry/api';
