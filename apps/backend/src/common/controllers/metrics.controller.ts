import { Controller, Get, Post, Body } from '@nestjs/common';
import { MetricsService } from '../observability/metrics.service';
import { TelemetryService } from '../observability/telemetry.service';
import { OtelService } from '../observability/otel.service';

interface MetricsTestRequest {
  deviceCount?: number;
  messageCount?: number;
  errorCount?: number;
}

interface SimulationRequest {
  scenario: 'device_lifecycle' | 'mqtt_load' | 'api_load' | 'auth_test' | 'error_simulation';
  deviceCount?: number;
  messageCount?: number;
  durationMs?: number;
}

@Controller('api/metrics')
export class MetricsController {
  private systemMetricsStopFn: (() => void) | null = null;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly telemetryService: TelemetryService,
    private readonly otelService: OtelService,
  ) {
    // Запускаем периодический сбор системных метрик
    this.systemMetricsStopFn = this.telemetryService.startSystemMetricsCollection(30000);
  }

  @Get('info')
  getMetricsInfo() {
    const config = this.otelService.getConfig();
    return {
      status: 'active',
      opentelemetry: {
        initialized: this.otelService.isInitialized(),
        config: config,
        endpoints: {
          traces: `${config.collectorUrl}/v1/traces`,
          metrics: `${config.collectorUrl}/v1/metrics`,
          logs: `${config.collectorUrl}/v1/logs`,
        },
      },
      availableMetrics: {
        automatic: [
          'http_requests_total',
          'http_request_duration_ms',
          'postgresql_operations_total',
          'redis_operations_total',
          'express_middleware_duration_ms',
        ],
        custom: [
          'iot_device_connections_total',
          'iot_active_devices',
          'iot_mqtt_messages_total',
          'iot_mqtt_message_processing_duration_ms',
          'iot_api_response_time_ms',
          'iot_auth_attempts_total',
          'iot_errors_total',
          'iot_device_memory_usage_bytes',
          'iot_websocket_connections_active',
          'iot_database_operations_total',
          'iot_system_memory_usage_bytes',
          'iot_process_memory_rss_bytes',
        ],
      },
      endpoints: [
        'GET /api/metrics/info - информация о метриках',
        'POST /api/metrics/test - тестирование генерации метрик',
        'POST /api/metrics/simulate - симуляция IoT сценариев',
      ],
    };
  }

  @Post('test')
  async testMetrics(@Body() request: MetricsTestRequest = {}) {
    const {
      deviceCount = 5,
      messageCount = 10,
      errorCount = 2,
    } = request;

    const results = [];

    // Тест метрик устройств
    for (let i = 0; i < deviceCount; i++) {
      const deviceId = `test-device-${i}`;
      const deviceType = i % 2 === 0 ? 'sensor' : 'actuator';

      this.metricsService.recordDeviceConnection({
        deviceId,
        deviceType,
        status: 'connected',
      });

      this.metricsService.updateActiveDevices(1, deviceType);
      results.push(`Device ${deviceId} connected`);
    }

    // Тест MQTT метрик
    for (let i = 0; i < messageCount; i++) {
      const messageType = ['telemetry', 'command', 'status'][i % 3];
      const topic = `/devices/test-device-${i % deviceCount}/${messageType}`;
      const success = i < messageCount - 1; // Последнее сообщение неуспешное
      const durationMs = Math.random() * 100 + 10;

      this.metricsService.recordMqttMessage({
        messageType,
        topic,
        success,
        durationMs,
      });

      results.push(`MQTT message processed: ${topic} (${success ? 'success' : 'error'})`);
    }

    // Тест API метрик
    const apiEndpoints = ['/api/devices', '/api/auth/login', '/api/mqtt/publish'];
    for (let i = 0; i < 5; i++) {
      const endpoint = apiEndpoints[i % apiEndpoints.length];
      const method = endpoint.includes('login') ? 'POST' : 'GET';
      const statusCode = i === 4 ? 500 : 200; // Последний запрос с ошибкой
      const durationMs = Math.random() * 200 + 50;

      this.metricsService.recordApiResponse({
        method,
        endpoint,
        statusCode,
        durationMs,
        userId: `test-user-${i}`,
      });

      results.push(`API call recorded: ${method} ${endpoint} (${statusCode})`);
    }

    // Тест метрик аутентификации
    for (let i = 0; i < 3; i++) {
      const success = i < 2; // Первые две успешные
      const method = ['oauth', 'token', 'basic'][i];

      this.metricsService.recordAuthAttempt({
        success,
        method: method as 'oauth' | 'token' | 'basic',
        userId: success ? `test-user-${i}` : undefined,
        errorType: success ? undefined : 'invalid_credentials',
      });

      results.push(`Auth attempt recorded: ${method} (${success ? 'success' : 'failure'})`);
    }

    // Тест метрик ошибок
    for (let i = 0; i < errorCount; i++) {
      const errorTypes = ['device_timeout', 'mqtt_connection_lost', 'database_error'];
      const operations = ['connect_device', 'process_message', 'save_data'];
      const severities = ['low', 'medium', 'high', 'critical'] as const;

      this.metricsService.recordError({
        errorType: errorTypes[i % errorTypes.length],
        operation: operations[i % operations.length],
        severity: severities[i % severities.length],
        deviceId: `test-device-${i}`,
      });

      results.push(`Error recorded: ${errorTypes[i % errorTypes.length]}`);
    }

    // Тест телеметрии и системных метрик
    this.telemetryService.collectSystemMetrics();
    this.telemetryService.recordWebSocketConnection(2, 'device_stream');
    this.telemetryService.recordDatabaseOperation('SELECT', 'devices', true, 25.5);

    results.push('System metrics collected');
    results.push('WebSocket connections recorded');
    results.push('Database operation recorded');

    return {
      message: 'Тестовые метрики успешно сгенерированы',
      generatedMetrics: results.length,
      details: results,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('simulate')
  async simulateScenario(@Body() request: SimulationRequest) {
    const { scenario, deviceCount = 10, messageCount = 50, durationMs = 5000 } = request;

    switch (scenario) {
      case 'device_lifecycle':
        return this.simulateDeviceLifecycle(deviceCount);

      case 'mqtt_load':
        return this.simulateMqttLoad(messageCount, durationMs);

      case 'api_load':
        return this.simulateApiLoad(messageCount, durationMs);

      case 'auth_test':
        return this.simulateAuthFlow(deviceCount);

      case 'error_simulation':
        return this.simulateErrorScenarios(deviceCount);

      default:
        return {
          error: 'Unknown scenario',
          availableScenarios: ['device_lifecycle', 'mqtt_load', 'api_load', 'auth_test', 'error_simulation'],
        };
    }
  }

  private async simulateDeviceLifecycle(deviceCount: number) {
    const results = [];

    for (let i = 0; i < deviceCount; i++) {
      const deviceId = `sim-device-${Date.now()}-${i}`;
      const deviceType = ['sensor', 'actuator', 'gateway'][i % 3];

      // Подключение устройства
      this.metricsService.recordDeviceConnection({
        deviceId,
        deviceType,
        status: 'connected',
      });
      this.metricsService.updateActiveDevices(1, deviceType);

      // Симуляция работы устройства
      await this.sleep(100);

      // Операции устройства
      this.metricsService.recordDeviceOperationSuccess(deviceId, 'data_collection', Math.random() * 50 + 10);
      this.metricsService.updateDeviceMemoryUsage(Math.random() * 1024 * 1024, deviceId);

      // Иногда устройство отключается
      if (Math.random() < 0.3) {
        this.metricsService.recordDeviceConnection({
          deviceId,
          deviceType,
          status: 'disconnected',
        });
        this.metricsService.updateActiveDevices(-1, deviceType);
        results.push(`Device ${deviceId} disconnected`);
      } else {
        results.push(`Device ${deviceId} connected and active`);
      }
    }

    return {
      scenario: 'device_lifecycle',
      devicesSimulated: deviceCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  private async simulateMqttLoad(messageCount: number, durationMs: number) {
    const results = [];
    const messageTypes = ['telemetry', 'command', 'status', 'alert', 'config'];
    const topics = ['sensor/temperature', 'actuator/valve', 'gateway/status', 'device/alert'];

    const startTime = Date.now();
    const endTime = startTime + durationMs;
    let processedMessages = 0;

    while (Date.now() < endTime && processedMessages < messageCount) {
      const messageType = messageTypes[processedMessages % messageTypes.length];
      const topic = topics[processedMessages % topics.length];
      const success = Math.random() > 0.05; // 95% success rate
      const processingTime = Math.random() * 30 + 5;

      this.metricsService.recordMqttOperation(topic, messageType, success, processingTime);

      if (!success) {
        this.metricsService.recordError({
          errorType: 'mqtt_processing_error',
          operation: 'process_message',
          severity: 'medium',
        });
      }

      processedMessages++;
      results.push(`Processed ${messageType} message on ${topic} (${success ? 'OK' : 'ERROR'})`);

      await this.sleep(Math.random() * 50 + 10);
    }

    return {
      scenario: 'mqtt_load',
      messagesProcessed: processedMessages,
      duration: Date.now() - startTime,
      results: results.slice(0, 10), // Показываем только первые 10 для краткости
      totalResults: results.length,
      timestamp: new Date().toISOString(),
    };
  }

  private async simulateApiLoad(requestCount: number, durationMs: number) {
    const results = [];
    const endpoints = [
      { path: '/api/devices', method: 'GET' },
      { path: '/api/devices', method: 'POST' },
      { path: '/api/devices/:id', method: 'PUT' },
      { path: '/api/mqtt/publish', method: 'POST' },
      { path: '/api/auth/refresh', method: 'POST' },
    ];

    const startTime = Date.now();
    const endTime = startTime + durationMs;
    let processedRequests = 0;

    while (Date.now() < endTime && processedRequests < requestCount) {
      const endpoint = endpoints[processedRequests % endpoints.length];
      const responseTime = Math.random() * 200 + 20;
      const statusCode = Math.random() > 0.1 ? 200 : 500; // 90% success rate

      this.metricsService.recordApiOperation(
        endpoint.method,
        endpoint.path,
        statusCode,
        responseTime,
        `user-${processedRequests % 5}`,
      );

      if (statusCode !== 200) {
        this.metricsService.recordError({
          errorType: 'api_error',
          operation: `${endpoint.method} ${endpoint.path}`,
          severity: statusCode >= 500 ? 'high' : 'medium',
        });
      }

      processedRequests++;
      results.push(`API ${endpoint.method} ${endpoint.path} - ${statusCode} (${responseTime.toFixed(1)}ms)`);

      await this.sleep(Math.random() * 20 + 5);
    }

    return {
      scenario: 'api_load',
      requestsProcessed: processedRequests,
      duration: Date.now() - startTime,
      results: results.slice(0, 10),
      totalResults: results.length,
      timestamp: new Date().toISOString(),
    };
  }

  private simulateAuthFlow(userCount: number) {
    const results = [];
    const authMethods = ['oauth', 'token', 'basic'] as const;

    for (let i = 0; i < userCount; i++) {
      const method = authMethods[i % authMethods.length];
      const success = Math.random() > 0.2; // 80% success rate
      const userId = success ? `user-${i}` : undefined;

      this.metricsService.recordAuthAttempt({
        method,
        success,
        userId,
        errorType: success ? undefined : 'invalid_credentials',
      });

      results.push(`Auth ${method} for user-${i}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }

    return {
      scenario: 'auth_test',
      authAttempts: userCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  private simulateErrorScenarios(scenarioCount: number) {
    const results = [];
    const errorScenarios = [
      { type: 'device_timeout', operation: 'connect_device', severity: 'medium' as const },
      { type: 'mqtt_connection_lost', operation: 'mqtt_subscribe', severity: 'high' as const },
      { type: 'database_connection_failed', operation: 'save_telemetry', severity: 'critical' as const },
      { type: 'auth_token_expired', operation: 'validate_token', severity: 'low' as const },
      { type: 'memory_limit_exceeded', operation: 'process_data', severity: 'high' as const },
    ];

    for (let i = 0; i < scenarioCount; i++) {
      const scenario = errorScenarios[i % errorScenarios.length];
      const deviceId = `error-device-${i}`;

      this.metricsService.recordError({
        errorType: scenario.type,
        operation: scenario.operation,
        severity: scenario.severity,
        deviceId,
      });

      results.push(`Error: ${scenario.type} during ${scenario.operation} (${scenario.severity})`);
    }

    return {
      scenario: 'error_simulation',
      errorsGenerated: scenarioCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup при завершении работы модуля
  onModuleDestroy() {
    if (this.systemMetricsStopFn) {
      this.systemMetricsStopFn();
    }
  }
}
