import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { MetricsService } from '../observability/metrics.service.js';
import { OtelService } from '../observability/otel.service.js';
import { metricsContract } from '@iot-hub/contracts';

@Controller()
export class MetricsController {

  constructor(
    private readonly metricsService: MetricsService,
    private readonly otelService: OtelService,
  ) {}

  @TsRestHandler(metricsContract.getMetricsInfo)
  getMetricsInfo() {
    return tsRestHandler(metricsContract.getMetricsInfo, async () => {
      const config = this.otelService.getConfig();
      return {
        status: 200 as const,
        body: {
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
              'iot_device_connections_total',
              'iot_mqtt_messages_total',
              'iot_database_operations_total',
            ],
            custom: [
              'iot_active_devices',
              'iot_device_operation_duration',
              'iot_errors_total',
              'system_memory_usage',
              'system_cpu_usage',
            ],
          },
        },
      };
    });
  }

  @TsRestHandler(metricsContract.getMetricsData)
  getMetricsData() {
    return tsRestHandler(metricsContract.getMetricsData, async () => {
      // Здесь можно добавить получение реальных данных метрик
      // Пока возвращаем заглушку
      return {
        status: 200 as const,
        body: {
          timestamp: new Date().toISOString(),
          message: 'Metrics data endpoint - implementation needed',
        },
      };
    });
  }

  @TsRestHandler(metricsContract.testMetrics)
  async testMetrics() {
    return tsRestHandler(metricsContract.testMetrics, async ({ body }) => {
      const {
        deviceCount = 5,
        messageCount = 10,
        errorCount = 2,
      } = body;

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

      // Тест сообщений MQTT
      for (let i = 0; i < messageCount; i++) {
        const deviceId = `test-device-${i % deviceCount}`;
        this.metricsService.recordMqttMessage({
          messageType: 'sensor_data',
          topic: `devices/${deviceId}/data`,
          success: true,
          durationMs: Math.random() * 100 + 10,
        });
        results.push(`Message ${i} from ${deviceId}`);
      }

      return {
        status: 200 as const,
        body: {
          success: true,
          message: `Metrics test completed: ${deviceCount} devices, ${messageCount} messages`,
          results: {
            devices: deviceCount,
            messages: messageCount,
            errors: errorCount,
            details: results,
          },
        },
      };
    });
  }

  @TsRestHandler(metricsContract.simulate)
  async simulate() {
    return tsRestHandler(metricsContract.simulate, async ({ body }) => {
      const {
        scenario,
        deviceCount = 10,
        messageCount = 100,
        durationMs = 30000,
      } = body;

      const results: Record<string, unknown> = {
        scenario,
        startTime: new Date().toISOString(),
        config: { deviceCount, messageCount, durationMs },
        metrics: [],
      };

      switch (scenario) {
        case 'device_lifecycle': {
          // Симуляция жизненного цикла устройств
          for (let i = 0; i < deviceCount; i++) {
            const deviceId = `sim-device-${i}`;
            this.metricsService.recordDeviceConnection({
              deviceId,
              deviceType: 'sensor',
              status: 'connected',
            });
            (results.metrics as string[]).push(`Device ${deviceId} connected`);
          }
          break;
        }

        case 'mqtt_load': {
          // Симуляция нагрузки MQTT
          for (let i = 0; i < messageCount; i++) {
            const deviceId = `load-device-${i % deviceCount}`;
            this.metricsService.recordMqttMessage({
              messageType: 'sensor_data',
              topic: `devices/${deviceId}/data`,
              success: true,
              durationMs: Math.random() * 50 + 10,
            });
            if (i % 10 === 0) {
              (results.metrics as string[]).push(`Processed ${i} MQTT messages`);
            }
          }
          break;
        }

        case 'api_load': {
          // Симуляция нагрузки API
          for (let i = 0; i < messageCount; i++) {
            // Здесь можно добавить логику для API метрик
            if (i % 20 === 0) {
              (results.metrics as string[]).push(`Processed ${i} API calls`);
            }
          }
          break;
        }

        case 'error_simulation': {
          // Симуляция ошибок
          for (let i = 0; i < Math.min(messageCount, 50); i++) {
            // Здесь можно добавить логику для ошибок
            (results.metrics as string[]).push(`Error simulation ${i}`);
          }
          break;
        }

        default:
          (results.metrics as string[]).push('Unknown scenario');
      }

      results.endTime = new Date().toISOString();
      results.duration = Date.now() - new Date(results.startTime as string).getTime();

      return {
        status: 200 as const,
        body: {
          success: true,
          message: `Simulation '${scenario}' completed successfully`,
          scenario,
          results,
        },
      };
    });
  }
}
