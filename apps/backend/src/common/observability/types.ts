// Types for OpenTelemetry observability
export * from './config.types.js';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface DeviceMetrics {
  deviceId: string;
  deviceType: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface MqttMetrics {
  messageType: string;
  topic: string;
  success: boolean;
  durationMs: number;
}

export interface ApiMetrics {
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
}

export interface AuthMetrics {
  method: 'oauth' | 'token' | 'basic';
  success: boolean;
  userId?: string;
  errorType?: string;
}

export interface ErrorMetrics {
  errorType: string;
  operation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviceId?: string;
  userId?: string;
}

// Удаляем дублирующий OtelConfig интерфейс, используем OpenTelemetryConfig из config.types.ts
