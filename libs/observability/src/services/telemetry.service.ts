import { Injectable } from '@nestjs/common';
import { trace, SpanStatusCode, context } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { ObservabilityConfigService } from './observability-config.service.js';

/**
 * Telemetry service for distributed tracing
 * Предоставляет удобные методы для создания и управления spans
 */
@Injectable()
export class TelemetryService {
  private readonly tracer = trace.getTracer('iot-hub-microservices', '1.0.0');
  private readonly serviceName: string;

  constructor(private readonly configService: ObservabilityConfigService) {
    this.serviceName = this.configService.getServiceInfo().name;
  }

  /**
   * Создать новый span для трейсинга
   */
  createSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): Span {
    const enrichedAttributes = {
      'service.name': this.serviceName,
      ...attributes,
    };

    return this.tracer.startSpan(name, {
      attributes: enrichedAttributes,
    });
  }

  /**
   * Выполнить операцию с автоматическим трейсингом
   */
  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.createSpan(operationName, attributes);

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Выполнить синхронную операцию с автоматическим трейсингом
   */
  traceSync<T>(
    operationName: string,
    operation: () => T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    const span = this.createSpan(operationName, attributes);

    try {
      const result = operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Создать контекст для трейсинга HTTP запроса
   */
  createHttpTraceContext(
    method: string,
    url: string,
    userAgent?: string,
    userId?: string
  ): Span {
    return this.createSpan(`HTTP ${method} ${url}`, {
      'http.method': method,
      'http.url': url,
      'http.user_agent': userAgent || 'unknown',
      'user.id': userId || 'anonymous',
      'span.kind': 'server',
    });
  }

  /**
   * Создать контекст для трейсинга операции с базой данных
   */
  createDatabaseTraceContext(
    operation: string,
    table: string,
    query?: string,
    queryType?: string
  ): Span {
    return this.createSpan(`DB ${operation}`, {
      'db.operation': operation,
      'db.table': table,
      'db.query': query || 'unknown',
      'db.query.type': queryType || 'unknown',
      'span.kind': 'client',
    });
  }

  /**
   * Создать контекст для трейсинга Kafka операции
   */
  createKafkaTraceContext(
    operation: 'produce' | 'consume',
    topic: string,
    consumerGroup?: string,
    messageKey?: string
  ): Span {
    const attributes: Record<string, string | number | boolean> = {
      'kafka.operation': operation,
      'kafka.topic': topic,
      'span.kind': operation === 'produce' ? 'producer' : 'consumer',
    };

    if (consumerGroup) {
      attributes['kafka.consumer.group'] = consumerGroup;
    }
    if (messageKey) {
      attributes['kafka.message.key'] = messageKey;
    }

    return this.createSpan(`Kafka ${operation}`, attributes);
  }

  /**
   * Создать контекст для трейсинга MQTT операции (для device-simulator)
   */
  createMqttTraceContext(
    operation: string,
    topic: string,
    clientId?: string,
    deviceId?: string
  ): Span {
    const attributes: Record<string, string | number | boolean> = {
      'mqtt.operation': operation,
      'mqtt.topic': topic,
      'span.kind': 'client',
    };

    if (clientId) {
      attributes['mqtt.client.id'] = clientId;
    }
    if (deviceId) {
      attributes['device.id'] = deviceId;
    }

    return this.createSpan(`MQTT ${operation}`, attributes);
  }

  /**
   * Создать контекст для трейсинга операции с устройством (для device-simulator)
   */
  createDeviceTraceContext(
    operation: string,
    deviceId: string,
    deviceType?: string,
    userId?: string
  ): Span {
    const attributes: Record<string, string | number | boolean> = {
      'device.operation': operation,
      'device.id': deviceId,
    };

    if (deviceType) {
      attributes['device.type'] = deviceType;
    }
    if (userId) {
      attributes['user.id'] = userId;
    }

    return this.createSpan(`Device ${operation}`, attributes);
  }

  /**
   * Создать контекст для трейсинга бизнес-операции
   */
  createBusinessTraceContext(
    operation: string,
    entityType: string,
    entityId?: string,
    userId?: string
  ): Span {
    const attributes: Record<string, string | number | boolean> = {
      'business.operation': operation,
      'business.entity.type': entityType,
    };

    if (entityId) {
      attributes['business.entity.id'] = entityId;
    }
    if (userId) {
      attributes['user.id'] = userId;
    }

    return this.createSpan(`Business ${operation}`, attributes);
  }

  /**
   * Получить текущий активный span
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Добавить атрибуты к текущему span
   */
  addAttributesToCurrentSpan(
    attributes: Record<string, string | number | boolean>
  ): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Записать событие в текущий span
   */
  addEventToCurrentSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Записать исключение в текущий span
   */
  recordExceptionInCurrentSpan(error: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Установить статус для текущего span
   */
  setCurrentSpanStatus(code: SpanStatusCode, message?: string): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setStatus({ code, message });
    }
  }

  /**
   * Создать child span от текущего активного span
   */
  createChildSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): Span {
    const enrichedAttributes = {
      'service.name': this.serviceName,
      ...attributes,
    };

    return this.tracer.startSpan(name, {
      attributes: enrichedAttributes,
    });
  }

  /**
   * Выполнить операцию в контексте указанного span
   */
  async withSpan<T>(span: Span, operation: () => Promise<T>): Promise<T> {
    return context.with(trace.setSpan(context.active(), span), operation);
  }

  /**
   * Получить trace ID текущего span
   */
  getCurrentTraceId(): string | undefined {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().traceId;
    }
    return undefined;
  }

  /**
   * Получить span ID текущего span
   */
  getCurrentSpanId(): string | undefined {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().spanId;
    }
    return undefined;
  }
}
