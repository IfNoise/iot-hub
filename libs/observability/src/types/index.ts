/**
 * Types for observability across microservices
 * Following Contract First principles - all types derived from Zod schemas
 */

import { z } from 'zod';
import { observabilityConfigSchema } from '../config/observability.schema.js';
import { loggingConfigSchema } from '../config/logging.schema.js';
import { telemetryConfigSchema } from '../config/telemetry.schema.js';

// Re-export types from Zod schemas - Contract First approach
export type ObservabilityConfig = z.infer<typeof observabilityConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type TelemetryConfig = z.infer<typeof telemetryConfigSchema>;

// Common Zod schemas for metrics and observability

// Base Service Metrics Schema
export const serviceMetricsSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string(),
  environment: z.string(),
});

export type ServiceMetrics = z.infer<typeof serviceMetricsSchema>;

// Metric Labels Schema
export const metricLabelsSchema = z.record(z.union([z.string(), z.number()]));
export type MetricLabels = z.infer<typeof metricLabelsSchema>;

// Performance Metrics Schemas
export const apiMetricsSchema = serviceMetricsSchema.extend({
  method: z.string(),
  endpoint: z.string(),
  statusCode: z.number(),
  durationMs: z.number(),
  userId: z.string().optional(),
});

export const databaseMetricsSchema = serviceMetricsSchema.extend({
  operation: z.string(),
  table: z.string(),
  success: z.boolean(),
  durationMs: z.number(),
  queryType: z
    .enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OTHER'])
    .optional(),
});

// Error Tracking Schema
export const errorMetricsSchema = serviceMetricsSchema.extend({
  errorType: z.string(),
  operation: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  userId: z.string().optional(),
  stackTrace: z.string().optional(),
});

// Authentication & Authorization Schema
export const authMetricsSchema = serviceMetricsSchema.extend({
  method: z.enum(['oauth', 'token', 'basic', 'jwt']),
  success: z.boolean(),
  userId: z.string().optional(),
  errorType: z.string().optional(),
});

// Microservice-specific Metrics Schemas

// User Management Service
export const userMetricsSchema = serviceMetricsSchema.extend({
  userId: z.string().optional(),
  operation: z.enum([
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'verify',
  ]),
  success: z.boolean(),
  durationMs: z.number().optional(),
});

// Device Simulator Service
export const deviceMetricsSchema = serviceMetricsSchema.extend({
  deviceId: z.string(),
  deviceType: z.string(),
  status: z.enum(['connected', 'disconnected', 'error', 'simulating']),
});

export const mqttMetricsSchema = serviceMetricsSchema.extend({
  messageType: z.string(),
  topic: z.string(),
  success: z.boolean(),
  durationMs: z.number(),
  deviceId: z.string().optional(),
  payloadSize: z.number().optional(),
});

// Kafka & Message Queue Metrics
export const kafkaMetricsSchema = serviceMetricsSchema.extend({
  operation: z.enum(['produce', 'consume']),
  topic: z.string(),
  success: z.boolean(),
  durationMs: z.number().optional(),
  consumerGroup: z.string().optional(),
});

// Business Logic Metrics
export const businessMetricsSchema = serviceMetricsSchema.extend({
  operation: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  success: z.boolean(),
  durationMs: z.number().optional(),
  userId: z.string().optional(),
});

// Service Information Schema
export const serviceInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  environment: z.string(),
  startedAt: z.date(),
});

// Health Check Schemas
export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'warning', 'error']),
  details: z.record(z.unknown()),
});

export const healthCheckResultSchema = healthCheckSchema.extend({
  timestamp: z.date(),
});

export const loggingHealthDetailsSchema = z.object({
  fileLoggingEnabled: z.boolean().optional(),
  logDirectoryWritable: z.boolean().optional(),
  logFileStats: z
    .object({
      exists: z.boolean(),
      size: z.number(),
      formattedSize: z.string(),
      lastModified: z.date(),
    })
    .nullable()
    .optional(),
  lokiConnectivity: z.boolean().optional(),
  configuration: z
    .object({
      level: z.string(),
      path: z.string(),
      maxSize: z.string(),
      maxFiles: z.number(),
    })
    .optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

export const loggingHealthCheckSchema = z.object({
  status: z.enum(['healthy', 'warning', 'error']),
  details: loggingHealthDetailsSchema,
});

export const observabilityHealthCheckSchema = healthCheckResultSchema.extend({
  components: z.object({
    logging: healthCheckResultSchema.optional(),
    telemetry: healthCheckResultSchema.optional(),
    metrics: healthCheckResultSchema.optional(),
  }),
});

// Logging Schemas
export const logMetadataSchema = z.object({
  requestId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
  deviceId: z.string().optional(),
  operation: z.string().optional(),
  component: z.string().optional(),
});

export const logContextSchema = z.object({
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  metadata: logMetadataSchema.optional(),
});

// Tracing Schemas
export const traceContextSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  operation: z.string(),
  service: z.string(),
});

// Export all types from schemas (Contract First)
export type ApiMetrics = z.infer<typeof apiMetricsSchema>;
export type DatabaseMetrics = z.infer<typeof databaseMetricsSchema>;
export type ErrorMetrics = z.infer<typeof errorMetricsSchema>;
export type AuthMetrics = z.infer<typeof authMetricsSchema>;
export type UserMetrics = z.infer<typeof userMetricsSchema>;
export type DeviceMetrics = z.infer<typeof deviceMetricsSchema>;
export type MqttMetrics = z.infer<typeof mqttMetricsSchema>;
export type KafkaMetrics = z.infer<typeof kafkaMetricsSchema>;
export type BusinessMetrics = z.infer<typeof businessMetricsSchema>;
export type ServiceInfo = z.infer<typeof serviceInfoSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
export type LoggingHealthDetails = z.infer<typeof loggingHealthDetailsSchema>;
export type LoggingHealthCheck = z.infer<typeof loggingHealthCheckSchema>;
export type ObservabilityHealthCheck = z.infer<
  typeof observabilityHealthCheckSchema
>;
export type LogMetadata = z.infer<typeof logMetadataSchema>;
export type LogContext = z.infer<typeof logContextSchema>;
export type TraceContext = z.infer<typeof traceContextSchema>;
