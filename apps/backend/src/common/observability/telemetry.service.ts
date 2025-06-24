import { Injectable } from '@nestjs/common';
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class TelemetryService {
  private readonly tracer = trace.getTracer('iot-hub-backend', '1.0.0');
  private readonly meter = metrics.getMeter('iot-hub-backend', '1.0.0');

  // Дополнительные метрики для телеметрии
  private readonly websocketConnections = this.meter.createUpDownCounter('iot_websocket_connections_active', {
    description: 'Number of active WebSocket connections',
  });

  private readonly databaseOperations = this.meter.createCounter('iot_database_operations_total', {
    description: 'Total number of database operations by type and table',
  });

  private readonly databaseQueryTime = this.meter.createHistogram('iot_database_query_duration_ms', {
    description: 'Database query execution time in milliseconds',
    unit: 'ms',
  });

  private readonly systemMemoryUsage = this.meter.createUpDownCounter('iot_system_memory_usage_bytes', {
    description: 'System memory usage in bytes',
    unit: 'bytes',
  });

  private readonly systemCpuUsage = this.meter.createUpDownCounter('iot_system_cpu_usage_percent', {
    description: 'System CPU usage percentage',
    unit: 'percent',
  });

  /**
   * Создать новый span для трейсинга
   */
  createSpan(name: string, attributes?: Record<string, string | number | boolean>) {
    const span = this.tracer.startSpan(name, {
      attributes: attributes || {},
    });
    return span;
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
   * Записать WebSocket соединение
   */
  recordWebSocketConnection(delta: number, connectionType?: string) {
    this.websocketConnections.add(delta, {
      connection_type: connectionType || 'unknown',
    });
  }

  /**
   * Записать операцию с базой данных
   */
  recordDatabaseOperation(operation: string, table: string, success: boolean, durationMs?: number) {
    this.databaseOperations.add(1, {
      operation,
      table,
      success: success.toString(),
    });

    if (durationMs !== undefined) {
      this.databaseQueryTime.record(durationMs, {
        operation,
        table,
        success: success.toString(),
      });
    }
  }

  /**
   * Обновить использование системной памяти
   */
  updateSystemMemoryUsage(bytes: number) {
    this.systemMemoryUsage.add(bytes, {});
  }

  /**
   * Обновить использование CPU
   */
  updateSystemCpuUsage(percent: number) {
    this.systemCpuUsage.add(percent, {});
  }

  /**
   * Собрать и записать системные метрики
   */
  collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      
      // Записываем использование памяти Node.js процессом
      this.meter.createUpDownCounter('iot_process_memory_rss_bytes', {
        description: 'Process RSS memory usage in bytes',
        unit: 'bytes',
      }).add(memUsage.rss, {});

      this.meter.createUpDownCounter('iot_process_memory_heap_used_bytes', {
        description: 'Process heap used memory in bytes',
        unit: 'bytes',
      }).add(memUsage.heapUsed, {});

      this.meter.createUpDownCounter('iot_process_memory_heap_total_bytes', {
        description: 'Process heap total memory in bytes',
        unit: 'bytes',
      }).add(memUsage.heapTotal, {});

      this.meter.createUpDownCounter('iot_process_memory_external_bytes', {
        description: 'Process external memory in bytes',
        unit: 'bytes',
      }).add(memUsage.external, {});

      // Записываем uptime процесса
      this.meter.createUpDownCounter('iot_process_uptime_seconds', {
        description: 'Process uptime in seconds',
        unit: 'seconds',
      }).add(process.uptime(), {});

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Начать периодический сбор системных метрик
   */
  startSystemMetricsCollection(intervalMs = 30000) {
    // Собираем метрики сразу
    this.collectSystemMetrics();
    
    // Затем периодически
    const interval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    // Возвращаем функцию для остановки сбора
    return () => clearInterval(interval);
  }

  /**
   * Создать контекст для трейсинга HTTP запроса
   */
  createHttpTraceContext(method: string, url: string, userAgent?: string) {
    return this.createSpan(`HTTP ${method} ${url}`, {
      'http.method': method,
      'http.url': url,
      'http.user_agent': userAgent || 'unknown',
    });
  }

  /**
   * Создать контекст для трейсинга MQTT операции
   */
  createMqttTraceContext(operation: string, topic: string, clientId?: string) {
    return this.createSpan(`MQTT ${operation}`, {
      'mqtt.operation': operation,
      'mqtt.topic': topic,
      'mqtt.client_id': clientId || 'unknown',
    });
  }

  /**
   * Создать контекст для трейсинга операции с устройством
   */
  createDeviceTraceContext(operation: string, deviceId: string, deviceType?: string) {
    return this.createSpan(`Device ${operation}`, {
      'device.operation': operation,
      'device.id': deviceId,
      'device.type': deviceType || 'unknown',
    });
  }

  /**
   * Создать контекст для трейсинга операции с базой данных
   */
  createDatabaseTraceContext(operation: string, table: string, query?: string) {
    return this.createSpan(`DB ${operation}`, {
      'db.operation': operation,
      'db.table': table,
      'db.query': query || 'unknown',
    });
  }

  /**
   * Получить текущий активный span
   */
  getCurrentSpan() {
    return trace.getActiveSpan();
  }

  /**
   * Добавить атрибуты к текущему span
   */
  addAttributesToCurrentSpan(attributes: Record<string, string | number | boolean>) {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Записать событие в текущий span
   */
  addEventToCurrentSpan(name: string, attributes?: Record<string, string | number | boolean>) {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Записать исключение в текущий span
   */
  recordExceptionInCurrentSpan(error: Error) {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }
}
