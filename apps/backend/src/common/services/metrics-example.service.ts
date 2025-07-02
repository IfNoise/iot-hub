import { Injectable } from '@nestjs/common';
import { MetricsService } from '../observability/metrics.service.js';
import { TelemetryService } from '../observability/telemetry.service.js';

@Injectable()
export class MetricsExampleService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  /**
   * Пример записи метрик при подключении устройства
   */
  async connectDevice(deviceId: string, deviceType: string) {
    return this.telemetryService.traceOperation(
      'device_connection',
      async () => {
        const startTime = Date.now();

        try {
          // Имитация подключения устройства
          await this.simulateDeviceConnection(deviceId);

          // Записываем успешное подключение
          this.metricsService.recordDeviceConnection({
            deviceId,
            deviceType,
            status: 'connected',
          });

          // Обновляем счетчик активных устройств
          this.metricsService.updateActiveDevices(1, deviceType);

          // Записываем время выполнения операции
          const duration = Date.now() - startTime;
          this.metricsService.recordCustomHistogram(
            'device_connection_duration_ms',
            duration,
            'ms',
            { device_type: deviceType, success: 'true' }
          );

          return { success: true, deviceId, duration };
        } catch (error) {
          // Записываем ошибку
          this.metricsService.recordError({
            errorType: 'device_connection_failed',
            operation: 'connect_device',
            severity: 'high',
            deviceId,
          });

          throw error;
        }
      },
      { device_id: deviceId, device_type: deviceType }
    );
  }

  /**
   * Пример записи метрик при обработке MQTT сообщения
   */
  async processMqttMessage(topic: string, messageType: string, payload: Record<string, unknown>) {
    return this.telemetryService.traceOperation(
      'mqtt_message_processing',
      async () => {
        const startTime = Date.now();

        try {
          // Имитация обработки сообщения
          await this.simulateMessageProcessing(payload);

          const duration = Date.now() - startTime;

          // Записываем метрики MQTT
          this.metricsService.recordMqttMessage({
            messageType,
            topic,
            success: true,
            durationMs: duration,
          });

          return { success: true, duration, messageSize: JSON.stringify(payload).length };
        } catch (error) {
          const duration = Date.now() - startTime;

          // Записываем неуспешную обработку
          this.metricsService.recordMqttMessage({
            messageType,
            topic,
            success: false,
            durationMs: duration,
          });

          // Записываем ошибку
          this.metricsService.recordError({
            errorType: 'mqtt_processing_error',
            operation: 'process_message',
            severity: 'medium',
          });

          throw error;
        }
      },
      { mqtt_topic: topic, message_type: messageType }
    );
  }

  /**
   * Пример записи метрик API запроса
   */
  async handleApiRequest(method: string, endpoint: string, userId?: string) {
    return this.telemetryService.traceOperation(
      'api_request_handling',
      async () => {
        const startTime = Date.now();

        try {
          // Имитация обработки API запроса
          const result = await this.simulateApiProcessing(endpoint);
          
          const duration = Date.now() - startTime;
          const statusCode = result.success ? 200 : 400;

          // Записываем метрики API
          this.metricsService.recordApiResponse({
            method,
            endpoint,
            statusCode,
            durationMs: duration,
            userId,
          });

          return { ...result, duration, statusCode };
        } catch (error) {
          const duration = Date.now() - startTime;

          // Записываем ошибку API
          this.metricsService.recordApiResponse({
            method,
            endpoint,
            statusCode: 500,
            durationMs: duration,
            userId,
          });

          // Записываем ошибку
          this.metricsService.recordError({
            errorType: 'api_error',
            operation: `${method} ${endpoint}`,
            severity: 'medium',
            userId,
          });

          throw error;
        }
      },
      { http_method: method, http_endpoint: endpoint, user_id: userId || 'anonymous' }
    );
  }

  /**
   * Пример записи метрик аутентификации
   */
  async authenticateUser(username: string, method: 'oauth' | 'token' | 'basic') {
    return this.telemetryService.traceOperation(
      'user_authentication',
      async () => {
        try {
          // Имитация аутентификации
          const authResult = await this.simulateAuthentication(username, method);

          // Записываем попытку аутентификации
          this.metricsService.recordAuthAttempt({
            method,
            success: authResult.success,
            userId: authResult.success ? authResult.userId : undefined,
            errorType: authResult.success ? undefined : authResult.errorType,
          });

          if (!authResult.success) {
            // Записываем ошибку аутентификации
            this.metricsService.recordError({
              errorType: authResult.errorType || 'auth_failed',
              operation: 'authenticate_user',
              severity: 'medium',
              userId: username,
            });
          }

          return authResult;
        } catch (error) {
          // Записываем критическую ошибку аутентификации
          this.metricsService.recordAuthAttempt({
            method,
            success: false,
            errorType: 'auth_system_error',
          });

          this.metricsService.recordError({
            errorType: 'auth_system_error',
            operation: 'authenticate_user',
            severity: 'critical',
            userId: username,
          });

          throw error;
        }
      },
      { auth_method: method, username }
    );
  }

  /**
   * Пример работы с базой данных с метриками
   */
  async performDatabaseOperation(operation: string, table: string, query?: string) {
    const span = this.telemetryService.createDatabaseTraceContext(operation, table, query);
    
    try {
      const startTime = Date.now();

      // Имитация работы с БД
      const result = await this.simulateDatabaseOperation(operation, table);
      
      const duration = Date.now() - startTime;

      // Записываем метрики БД
      this.telemetryService.recordDatabaseOperation(operation, table, result.success, duration);

      if (!result.success) {
        this.metricsService.recordError({
          errorType: 'database_operation_failed',
          operation: `db_${operation}`,
          severity: 'high',
        });
      }

      return { ...result, duration };
    } catch (error) {
      // Записываем критическую ошибку БД
      this.telemetryService.recordDatabaseOperation(operation, table, false);
      
      this.metricsService.recordError({
        errorType: 'database_connection_error',
        operation: `db_${operation}`,
        severity: 'critical',
      });

      this.telemetryService.recordExceptionInCurrentSpan(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Пример периодического сбора кастомных метрик
   */
  startPeriodicMetricsCollection(intervalMs = 30000) {
    const collectCustomMetrics = () => {
      try {
        // Собираем кастомные метрики приложения
        this.collectApplicationMetrics();
        
        // Обновляем системные метрики
        this.telemetryService.collectSystemMetrics();
        
        console.log('📊 Кастомные метрики собраны', new Date().toISOString());
      } catch (error) {
        console.error('❌ Ошибка сбора кастомных метрик:', error);
        
        this.metricsService.recordError({
          errorType: 'metrics_collection_error',
          operation: 'collect_custom_metrics',
          severity: 'low',
        });
      }
    };

    // Собираем метрики сразу
    collectCustomMetrics();
    
    // Затем периодически
    const interval = setInterval(collectCustomMetrics, intervalMs);

    return () => clearInterval(interval);
  }

  private collectApplicationMetrics() {
    // Пример сбора метрик приложения
    const memUsage = process.memoryUsage();
    
    // Записываем использование памяти
    this.metricsService.updateCustomGauge('app_memory_heap_used_mb', memUsage.heapUsed / 1024 / 1024);
    this.metricsService.updateCustomGauge('app_memory_heap_total_mb', memUsage.heapTotal / 1024 / 1024);
    this.metricsService.updateCustomGauge('app_memory_rss_mb', memUsage.rss / 1024 / 1024);
    
    // Время работы приложения
    this.metricsService.updateCustomGauge('app_uptime_hours', process.uptime() / 3600);
  }

  // === Методы имитации операций ===

  private async simulateDeviceConnection(deviceId: string): Promise<void> {
    // Имитация времени подключения устройства
    await this.sleep(Math.random() * 100 + 50);
    
    // Иногда подключение не удается
    if (Math.random() < 0.05) {
      throw new Error(`Failed to connect device ${deviceId}`);
    }
  }

  private async simulateMessageProcessing(_payload: Record<string, unknown>): Promise<void> {
    // Имитация обработки сообщения
    await this.sleep(Math.random() * 50 + 10);
    
    // Иногда обработка не удается
    if (Math.random() < 0.03) {
      throw new Error('Message processing failed');
    }
  }

  private async simulateApiProcessing(endpoint: string): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    // Имитация обработки API
    await this.sleep(Math.random() * 200 + 20);
    
    // Разная вероятность успеха для разных endpoints
    const successRate = endpoint.includes('auth') ? 0.95 : 0.98;
    
    return {
      success: Math.random() < successRate,
      data: { endpoint, timestamp: Date.now() },
    };
  }

  private async simulateAuthentication(username: string, method: string): Promise<{
    success: boolean;
    userId?: string;
    errorType?: string;
  }> {
    // Имитация аутентификации
    await this.sleep(Math.random() * 300 + 100);
    
    // Разная вероятность успеха для разных методов
    const successRates = { oauth: 0.95, token: 0.98, basic: 0.90 };
    const successRate = successRates[method as keyof typeof successRates] || 0.90;
    
    const success = Math.random() < successRate;
    
    return {
      success,
      userId: success ? `user_${username}_${Date.now()}` : undefined,
      errorType: success ? undefined : ['invalid_credentials', 'token_expired', 'user_not_found'][Math.floor(Math.random() * 3)],
    };
  }

  private async simulateDatabaseOperation(_operation: string, _table: string): Promise<{ success: boolean; rowsAffected?: number }> {
    // Имитация операции с БД
    await this.sleep(Math.random() * 100 + 10);
    
    // Высокая вероятность успеха для БД
    const success = Math.random() < 0.98;
    
    return {
      success,
      rowsAffected: success ? Math.floor(Math.random() * 10) + 1 : undefined,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
