import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {

  @Get('test')
  @ApiOperation({ summary: 'Test custom metrics generation' })
  @ApiResponse({ status: 200, description: 'Metrics generated successfully' })
  async testMetrics() {
    console.log('🧪 Запуск тестирования кастомных метрик...');
    
    // Симулируем подключение устройства
    MetricsService.recordDeviceConnection('test-device-001', 'temperature-sensor');
    MetricsService.updateActiveDevices(1, 'temperature-sensor');
    
    // Симулируем обработку MQTT сообщения
    const processingTime = Math.random() * 100;
    MetricsService.recordMqttMessageProcessing(processingTime, 'telemetry', true);
    
    // Симулируем API запрос (этот самый запрос)
    const startTime = Date.now();
    setTimeout(() => {
      const endTime = Date.now();
      MetricsService.recordApiResponse(endTime - startTime, 'GET', '/api/metrics/test', 200);
    }, 1);
    
    // Симулируем аутентификацию
    MetricsService.recordAuthAttempt(true, 'jwt', 'test-user-123');
    
    // Обновляем использование памяти
    MetricsService.updateDeviceMemoryUsage(1024 * 64, 'test-device-001'); // 64KB
    
    console.log('✅ Кастомные метрики записаны и будут отправлены через ~10 секунд');
    
    return {
      success: true,
      message: 'Custom metrics generated successfully',
      timestamp: new Date().toISOString(),
      metrics: [
        'iot_device_connections_total',
        'iot_active_devices',
        'iot_mqtt_message_processing_duration_ms',
        'iot_mqtt_messages_total',
        'iot_api_response_time_ms',
        'iot_auth_attempts_total',
        'iot_device_memory_usage_bytes'
      ]
    };
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate complex IoT scenario metrics' })
  @ApiResponse({ status: 200, description: 'Simulation completed' })
  async simulateComplexScenario(@Body() body: { deviceCount?: number; messageCount?: number }) {
    const deviceCount = body.deviceCount || 3;
    const messageCount = body.messageCount || 5;
    
    console.log(`🚀 Симуляция IoT сценария: ${deviceCount} устройств, ${messageCount} сообщений каждое`);
    
    const deviceTypes = ['temperature-sensor', 'humidity-sensor', 'motion-detector', 'door-sensor'];
    const messageTypes = ['telemetry', 'alert', 'heartbeat', 'status'];
    
    // Симулируем подключение устройств
    for (let i = 1; i <= deviceCount; i++) {
      const deviceId = `device-${String(i).padStart(3, '0')}`;
      const deviceType = deviceTypes[i % deviceTypes.length];
      
      MetricsService.recordDeviceConnection(deviceId, deviceType);
      MetricsService.updateActiveDevices(1, deviceType);
      
      // Симулируем память устройства
      const memoryUsage = Math.floor(Math.random() * 1024 * 100) + 1024 * 50; // 50-150KB
      MetricsService.updateDeviceMemoryUsage(memoryUsage, deviceId);
    }
    
    // Симулируем MQTT сообщения
    for (let i = 1; i <= deviceCount; i++) {
      const deviceId = `device-${String(i).padStart(3, '0')}`;
      
      for (let j = 1; j <= messageCount; j++) {
        const messageType = messageTypes[j % messageTypes.length];
        const processingTime = Math.random() * 200 + 10; // 10-210ms
        const success = Math.random() > 0.1; // 90% успешных
        
        MetricsService.recordMqttMessageProcessing(processingTime, messageType, success);
        
        if (!success) {
          MetricsService.recordError('processing_failed', 'mqtt_message', deviceId);
        }
      }
    }
    
    // Симулируем API запросы
    const apiEndpoints = ['/api/devices', '/api/telemetry', '/api/devices/status', '/api/alerts'];
    const httpMethods = ['GET', 'POST', 'PUT'];
    
    for (let i = 0; i < 10; i++) {
      const method = httpMethods[i % httpMethods.length];
      const endpoint = apiEndpoints[i % apiEndpoints.length];
      const responseTime = Math.random() * 500 + 50; // 50-550ms
      const statusCode = Math.random() > 0.05 ? 200 : 500; // 95% успешных
      
      MetricsService.recordApiResponse(responseTime, method, endpoint, statusCode);
      
      if (statusCode >= 400) {
        MetricsService.recordError('api_error', 'api_request');
      }
    }
    
    // Симулируем аутентификацию
    const authMethods = ['jwt', 'apikey', 'certificate'];
    for (let i = 0; i < 7; i++) {
      const method = authMethods[i % authMethods.length];
      const success = Math.random() > 0.2; // 80% успешных
      const userId = success ? `user-${i + 1}` : undefined;
      
      MetricsService.recordAuthAttempt(success, method, userId);
      
      if (!success) {
        MetricsService.recordError('auth_failed', 'authentication', userId);
      }
    }
    
    console.log(`✅ Симуляция завершена. Сгенерированы метрики для ${deviceCount} устройств`);
    
    return {
      success: true,
      message: 'Complex IoT scenario simulation completed',
      timestamp: new Date().toISOString(),
      summary: {
        devicesSimulated: deviceCount,
        messagesPerDevice: messageCount,
        totalMqttMessages: deviceCount * messageCount,
        apiRequests: 10,
        authAttempts: 7
      }
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get OpenTelemetry metrics configuration info' })
  @ApiResponse({ status: 200, description: 'Configuration information' })
  getMetricsInfo() {
    return {
      openTelemetry: {
        enabled: true,
        collectorUrl: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318',
        serviceName: process.env.OTEL_SERVICE_NAME || 'iot-hub-backend',
        exportInterval: `${process.env.OTEL_METRICS_EXPORT_INTERVAL || '10000'}ms`,
        exportTimeout: `${process.env.OTEL_METRICS_EXPORT_TIMEOUT || '5000'}ms`,
      },
      automaticMetrics: [
        'HTTP requests (route, method, status_code)',
        'Database queries (PostgreSQL)',
        'Redis operations',
        'Express middleware timing',
        'Node.js runtime metrics'
      ],
      customMetrics: [
        'iot_device_connections_total - Device connection counter',
        'iot_active_devices - Active devices gauge',
        'iot_mqtt_message_processing_duration_ms - MQTT processing time histogram',
        'iot_mqtt_messages_total - MQTT messages counter',
        'iot_api_response_time_ms - API response time histogram',
        'iot_auth_attempts_total - Authentication attempts counter',
        'iot_errors_total - Errors counter by type',
        'iot_device_memory_usage_bytes - Device memory usage gauge'
      ]
    };
  }
}
