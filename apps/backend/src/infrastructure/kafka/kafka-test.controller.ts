import { Controller, Logger, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { KafkaProducerService } from './kafka-producer.service.js';
import { KafkaService } from './kafka.service.js';
import { DeviceEventService } from './device-event.service.js';

interface TestMessageDto {
  topic: string;
  key: string;
  message: Record<string, unknown>;
}

@ApiTags('Kafka Testing')
@Controller('kafka-test')
export class KafkaTestController {
  private readonly logger = new Logger(KafkaTestController.name);

  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaService: KafkaService,
    private readonly deviceEventService: DeviceEventService
  ) {}

  @Post('send-message')
  @ApiOperation({ summary: 'Send test message to Kafka topic' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', example: 'device-events' },
        key: { type: 'string', example: 'device-123' },
        message: {
          type: 'object',
          example: { event: 'test', timestamp: '2024-01-01T00:00:00Z' },
        },
      },
      required: ['topic', 'key', 'message'],
    },
  })
  async sendTestMessage(@Body() dto: TestMessageDto) {
    try {
      this.logger.log(`📤 Sending test message to topic: ${dto.topic}`);

      // Ensure topic exists
      await this.kafkaService.createTopics([dto.topic]);

      // Send message
      await this.kafkaProducerService.sendEvent(
        dto.topic,
        dto.key,
        dto.message
      );

      return {
        success: true,
        message: `Message sent to topic ${dto.topic}`,
        data: { topic: dto.topic, key: dto.key },
      };
    } catch (error) {
      this.logger.error('❌ Failed to send test message', error);
      return {
        success: false,
        message: 'Failed to send message',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('create-topics')
  @ApiOperation({ summary: 'Create Kafka topics' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topics: {
          type: 'array',
          items: { type: 'string' },
          example: ['device-events', 'user-events', 'system-events'],
        },
      },
      required: ['topics'],
    },
  })
  async createTopics(@Body() dto: { topics: string[] }) {
    try {
      this.logger.log(`📝 Creating topics: ${dto.topics.join(', ')}`);

      await this.kafkaService.createTopics(dto.topics);

      return {
        success: true,
        message: `Topics created: ${dto.topics.join(', ')}`,
        topics: dto.topics,
      };
    } catch (error) {
      this.logger.error('❌ Failed to create topics', error);
      return {
        success: false,
        message: 'Failed to create topics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('send-device-status')
  @ApiOperation({
    summary: 'Send device status change event using contract schema',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', example: 'device-123' },
        previousStatus: {
          type: 'string',
          enum: ['online', 'offline', 'error', 'sleep', 'maintenance'],
          example: 'offline',
        },
        currentStatus: {
          type: 'string',
          enum: ['online', 'offline', 'error', 'sleep', 'maintenance'],
          example: 'online',
        },
      },
      required: ['deviceId', 'previousStatus', 'currentStatus'],
    },
  })
  async sendDeviceStatusEvent(
    @Body()
    event: {
      deviceId: string;
      previousStatus: 'online' | 'offline' | 'error' | 'sleep' | 'maintenance';
      currentStatus: 'online' | 'offline' | 'error' | 'sleep' | 'maintenance';
    }
  ) {
    try {
      this.logger.log(
        `📤 Sending device status change event for device: ${event.deviceId}`
      );

      const deviceEvent = {
        eventType: 'device.status.changed' as const,
        correlationId: `evt_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend' as const,
          id: 'kafka-test-controller',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: event.deviceId,
          previousStatus: event.previousStatus,
          currentStatus: event.currentStatus,
          changedAt: new Date().toISOString(),
          reason: 'test-event',
        },
      };

      await this.deviceEventService.publishDeviceEvent(deviceEvent);

      return {
        success: true,
        message: `Device status event sent for ${event.deviceId}`,
        data: { deviceId: event.deviceId, status: event.currentStatus },
      };
    } catch (error) {
      this.logger.error('❌ Failed to send device event', error);
      return {
        success: false,
        message: 'Failed to send device event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('send-device-rpc')
  @ApiOperation({ summary: 'Send device RPC command using contract schema' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', example: 'device-123' },
        method: {
          type: 'string',
          example: 'reboot',
          enum: [
            'getDeviceState',
            'getSensors',
            'reboot',
            'updateDiscreteTimer',
            'updateAnalogTimer',
            'updateDiscreteRegulator',
            'updateAnalogRegulator',
            'updateIrrigator',
            'setOutput',
            'getConfiguration',
            'setConfiguration',
          ],
        },
        requestedBy: { type: 'string', example: 'admin-user-123' },
        params: {
          type: 'object',
          example: { timeout: 30 },
        },
      },
      required: ['deviceId', 'method', 'requestedBy'],
    },
  })
  async sendDeviceRpcCommand(
    @Body()
    command: {
      deviceId: string;
      method:
        | 'getDeviceState'
        | 'getSensors'
        | 'reboot'
        | 'updateDiscreteTimer'
        | 'updateAnalogTimer'
        | 'updateDiscreteRegulator'
        | 'updateAnalogRegulator'
        | 'updateIrrigator'
        | 'setOutput'
        | 'getConfiguration'
        | 'setConfiguration';
      requestedBy: string;
      params?: Record<string, unknown>;
    }
  ) {
    try {
      this.logger.log(
        `📤 Sending RPC command '${command.method}' to device: ${command.deviceId}`
      );

      const deviceCommand = {
        eventType: 'device.command.rpc' as const,
        correlationId: `rpc_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend' as const,
          id: 'kafka-test-controller',
          version: '1.0.0',
        },
        __version: '1.0',
        payload: {
          deviceId: command.deviceId,
          method: command.method,
          params: command.params || {},
          requestedBy: command.requestedBy,
        },
        timeout: 30000,
        responseRequired: true,
      };

      await this.deviceEventService.publishDeviceCommand(deviceCommand);

      return {
        success: true,
        message: `RPC command '${command.method}' sent to device ${command.deviceId}`,
        data: {
          deviceId: command.deviceId,
          method: command.method,
          correlationId: deviceCommand.correlationId,
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to send device RPC command', error);
      return {
        success: false,
        message: 'Failed to send device RPC command',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
