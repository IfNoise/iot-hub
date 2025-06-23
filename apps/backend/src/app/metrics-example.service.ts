import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics';

/**
 * Пример сервиса для демонстрации использования OpenTelemetry метрик
 * в IoT Hub backend приложении
 */
@Injectable()
export class MetricsExampleService {
  
  /**
   * Симуляция подключения IoT устройства
   */
  async simulateDeviceConnection(deviceId: string, deviceType: string = 'sensor'): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Записываем метрику подключения устройства
      MetricsService.recordDeviceConnection(deviceId, deviceType);
      
      // Увеличиваем счетчик активных устройств
      MetricsService.updateActiveDevices(1, deviceType);
      
      // Симуляция времени подключения
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      console.log(`✅ Устройство ${deviceId} (${deviceType}) подключено`);
      
    } catch (error) {
      // Записываем ошибку
      MetricsService.recordError('connection_failed', 'device_connection', deviceId);
      console.error(`❌ Ошибка подключения устройства ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Симуляция обработки MQTT сообщения от устройства
   */
  async simulateMqttMessageProcessing(
    deviceId: string, 
    messageType: string = 'telemetry', 
    payload: any = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Симуляция времени обработки сообщения
      const processingTime = Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Записываем метрику обработки сообщения
      MetricsService.recordMqttMessageProcessing(processingTime, messageType, true);
      
      console.log(`📨 MQTT сообщение от ${deviceId} обработано (${processingTime.toFixed(2)}ms)`);
      
    } catch (error) {
      const endTime = Date.now();
      const failedProcessingTime = endTime - startTime;
      
      // Записываем неудачную обработку
      MetricsService.recordMqttMessageProcessing(failedProcessingTime, messageType, false);
      MetricsService.recordError('message_processing_failed', 'mqtt_processing', deviceId);
      
      console.error(`❌ Ошибка обработки MQTT сообщения от ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Симуляция API запроса с записью метрик
   */
  async simulateApiRequest(method: string, endpoint: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Симуляция времени обработки API запроса
      const responseTime = Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, responseTime));
      
      const statusCode = Math.random() > 0.1 ? 200 : 500; // 90% успешных запросов
      
      // Записываем метрику времени ответа API
      MetricsService.recordApiResponse(responseTime, method, endpoint, statusCode);
      
      if (statusCode >= 400) {
        MetricsService.recordError('api_error', 'api_request');
        throw new Error(`API Error: ${statusCode}`);
      }
      
      console.log(`🌐 API ${method} ${endpoint} - ${statusCode} (${responseTime.toFixed(2)}ms)`);
      
      return { status: statusCode, responseTime };
      
    } catch (error) {
      const endTime = Date.now();
      const failedResponseTime = endTime - startTime;
      
      MetricsService.recordApiResponse(failedResponseTime, method, endpoint, 500);
      MetricsService.recordError('api_error', 'api_request');
      
      throw error;
    }
  }

  /**
   * Симуляция аутентификации пользователя
   */
  async simulateAuthentication(method: string = 'jwt', userId?: string): Promise<boolean> {
    try {
      // Симуляция проверки аутентификации
      const success = Math.random() > 0.2; // 80% успешных аутентификаций
      
      MetricsService.recordAuthAttempt(success, method, userId);
      
      if (!success) {
        MetricsService.recordError('auth_failed', 'authentication', userId);
        console.log(`🔐 Аутентификация неуспешна для ${userId || 'anonymous'}`);
        return false;
      }
      
      console.log(`🔓 Аутентификация успешна для ${userId || 'anonymous'}`);
      return true;
      
    } catch (error) {
      MetricsService.recordError('auth_error', 'authentication', userId);
      console.error('❌ Ошибка аутентификации:', error);
      return false;
    }
  }

  /**
   * Симуляция изменения использования памяти устройством
   */
  updateDeviceMemoryUsage(deviceId: string, memoryBytes: number): void {
    MetricsService.updateDeviceMemoryUsage(memoryBytes, deviceId);
    console.log(`💾 Устройство ${deviceId}: использование памяти ${memoryBytes} байт`);
  }

  /**
   * Запуск симуляции для демонстрации метрик
   */
  async runSimulation(): Promise<void> {
    console.log('🚀 Запуск симуляции IoT метрик...');
    
    // Симуляция подключения устройств
    await this.simulateDeviceConnection('device-001', 'temperature-sensor');
    await this.simulateDeviceConnection('device-002', 'humidity-sensor');
    await this.simulateDeviceConnection('device-003', 'motion-detector');
    
    // Симуляция MQTT сообщений
    await this.simulateMqttMessageProcessing('device-001', 'telemetry', { temperature: 25.5 });
    await this.simulateMqttMessageProcessing('device-002', 'telemetry', { humidity: 60 });
    await this.simulateMqttMessageProcessing('device-003', 'alert', { motion: true });
    
    // Симуляция API запросов
    await this.simulateApiRequest('GET', '/api/devices');
    await this.simulateApiRequest('POST', '/api/devices/register');
    await this.simulateApiRequest('GET', '/api/telemetry');
    
    // Симуляция аутентификации
    await this.simulateAuthentication('jwt', 'user-123');
    await this.simulateAuthentication('apikey', 'device-001');
    
    // Обновление использования памяти
    this.updateDeviceMemoryUsage('device-001', 1024 * 50); // 50KB
    this.updateDeviceMemoryUsage('device-002', 1024 * 75); // 75KB
    
    console.log('✅ Симуляция завершена. Метрики отправлены в OpenTelemetry Collector.');
  }
}
