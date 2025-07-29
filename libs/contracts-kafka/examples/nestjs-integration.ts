/**
 * import { Injectable, Controller, Post, Body, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { KafkaContext } from '@nestjs/microservices/ctx-host';
import { 
  DeviceRpcCommand, 
  DeviceBoundEvent,
  DeviceRpcResponse,
  KafkaTopics,
  AllKafkaMessageSchemas,
  adaptRestBindDeviceToKafka 
} from '../index.js';грации Kafka контрактов с NestJS
 *
 * Этот файл показывает, как использовать новые Kafka контракты
 * в реальном NestJS приложении
 */

import { Injectable, Controller, Post, Body, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { KafkaContext } from '@nestjs/microservices/ctx-host';
import {
  DeviceRpcCommand,
  DeviceBoundEvent,
  DeviceRpcResponse,
  KafkaTopics,
  AllKafkaMessageSchemas,
  adaptRestBindDeviceToKafka,
} from '@iot-hub/contracts-kafka';

/**
 * =============================================
 * KAFKA PRODUCER SERVICE
 * =============================================
 */

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  async sendCommand(command: DeviceRpcCommand): Promise<void> {
    try {
      // Валидируем команду перед отправкой
      const validatedCommand = AllKafkaMessageSchemas.parse(command);

      await this.kafkaClient.emit(KafkaTopics.DeviceCommands, {
        value: JSON.stringify(validatedCommand),
        key: command.payload.deviceId,
        headers: {
          'content-type': 'application/json',
          'correlation-id': command.correlationId,
          'event-type': command.eventType,
        },
      });

      this.logger.log(`Command sent: ${command.eventType}`, {
        deviceId: command.payload.deviceId,
        correlationId: command.correlationId,
      });
    } catch (error) {
      this.logger.error('Failed to send Kafka command', error);
      throw error;
    }
  }

  async publishEvent(event: DeviceBoundEvent): Promise<void> {
    try {
      const validatedEvent = AllKafkaMessageSchemas.parse(event);

      await this.kafkaClient.emit(KafkaTopics.DeviceEvents, {
        value: JSON.stringify(validatedEvent),
        key: event.payload.deviceId,
        headers: {
          'content-type': 'application/json',
          'event-type': event.eventType,
        },
      });

      this.logger.log(`Event published: ${event.eventType}`, {
        deviceId: event.payload.deviceId,
      });
    } catch (error) {
      this.logger.error('Failed to publish Kafka event', error);
      throw error;
    }
  }
}

/**
 * =============================================
 * REST CONTROLLER (с Kafka адаптером)
 * =============================================
 */

@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly responseAwaiter: KafkaResponseAwaiterService
  ) {}

  @Post('bind-qr')
  async bindDeviceQR(
    @Body() body: { deviceId: string; token: string; deviceName?: string },
    @CurrentUser() user: { id: string }
  ) {
    const correlationId = crypto.randomUUID();

    // Конвертируем REST запрос в Kafka команду
    const kafkaCommand = adaptRestBindDeviceToKafka(
      body,
      user.id,
      correlationId
    );

    // Отправляем команду в Kafka
    await this.kafkaProducer.sendCommand(kafkaCommand);

    // Ждем ответ (с таймаутом)
    const response = await this.responseAwaiter.waitForResponse(
      correlationId,
      30000 // 30 секунд
    );

    if (response.success) {
      return {
        message: 'Device successfully bound',
        device: response.payload,
      };
    } else {
      throw new BadRequestException(response.error?.message);
    }
  }
}

/**
 * =============================================
 * KAFKA CONSUMER (обработка команд)
 * =============================================
 */

@Injectable()
export class DeviceCommandConsumer {
  private readonly logger = new Logger(DeviceCommandConsumer.name);

  constructor(
    private readonly deviceService: DeviceService,
    private readonly kafkaProducer: KafkaProducerService
  ) {}

  @EventPattern(KafkaTopics.DeviceCommands)
  async handleDeviceCommand(
    @Payload() message: unknown,
    @Ctx() context: KafkaContext
  ) {
    try {
      // Валидируем входящее сообщение
      const command = AllKafkaMessageSchemas.parse(message);

      if (command.eventType !== 'device.command.rpc') {
        return; // Игнорируем неподходящие события
      }

      this.logger.log(`Processing device command: ${command.payload.method}`, {
        deviceId: command.payload.deviceId,
        correlationId: command.correlationId,
      });

      let result;
      let success = true;
      let error;

      try {
        // Выполняем команду
        switch (command.payload.method) {
          case 'getDeviceState':
            result = await this.deviceService.getDeviceState(
              command.payload.deviceId
            );
            break;
          case 'getSensors':
            result = await this.deviceService.getSensors(
              command.payload.deviceId
            );
            break;
          case 'reboot':
            result = await this.deviceService.rebootDevice(
              command.payload.deviceId
            );
            break;
          default:
            throw new Error(`Unknown method: ${command.payload.method}`);
        }
      } catch (err) {
        success = false;
        error = {
          code: 'EXECUTION_FAILED',
          message: err.message,
          details: { method: command.payload.method },
        };
      }

      // Отправляем ответ
      const response: DeviceRpcResponse = {
        eventType: 'device.response.rpc',
        correlationId: command.correlationId,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'device-service',
        },
        __version: 'v1',
        success,
        error,
        payload: {
          deviceId: command.payload.deviceId,
          method: command.payload.method,
          result,
        },
      };

      await this.kafkaProducer.sendResponse(response);
    } catch (error) {
      this.logger.error('Failed to process device command', {
        error: error.message,
        message,
        partition: context.getPartition(),
        offset: context.getMessage().offset,
      });

      // Acknowledge сообщение, чтобы не зациклиться
      context.getMessage().ack();
    }
  }
}

/**
 * =============================================
 * KAFKA CONSUMER (обработка событий)
 * =============================================
 */

@Injectable()
export class DeviceEventConsumer {
  private readonly logger = new Logger(DeviceEventConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService
  ) {}

  @EventPattern(KafkaTopics.DeviceEvents)
  async handleDeviceEvent(
    @Payload() message: unknown,
    @Ctx() context: KafkaContext
  ) {
    try {
      const event = AllKafkaMessageSchemas.parse(message);

      this.logger.log(`Processing device event: ${event.eventType}`, {
        source: event.source,
        timestamp: event.timestamp,
      });

      // Обрабатываем различные типы событий
      switch (event.eventType) {
        case 'device.bound':
          await this.handleDeviceBound(event as DeviceBoundEvent);
          break;
        case 'device.status.changed':
          await this.handleDeviceStatusChanged(event);
          break;
        case 'device.telemetry.received':
          await this.handleTelemetryReceived(event);
          break;
        case 'device.alert.raised':
          await this.handleAlertRaised(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.eventType}`);
      }

      // Записываем в аудит лог
      await this.auditService.logEvent(event);
    } catch (error) {
      this.logger.error('Failed to process device event', {
        error: error.message,
        message,
      });
    }
  }

  private async handleDeviceBound(event: DeviceBoundEvent) {
    // Отправляем уведомление пользователю
    await this.notificationService.sendToUser(event.payload.userId, {
      type: 'device_bound',
      title: 'Device Successfully Bound',
      message: `Device ${event.payload.deviceId} has been bound to your account`,
      data: event.payload,
    });

    // Обновляем статистику
    await this.updateUserDeviceStats(event.payload.userId);
  }
}

/**
 * =============================================
 * RESPONSE AWAITER SERVICE
 * =============================================
 */

@Injectable()
export class KafkaResponseAwaiterService {
  private readonly pendingResponses = new Map<
    string,
    {
      resolve: (value: DeviceRpcResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor() {
    // Подписываемся на ответы
    this.setupResponseListener();
  }

  async waitForResponse(
    correlationId: string,
    timeoutMs: number = 30000
  ): Promise<DeviceRpcResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(correlationId);
        reject(
          new Error(`Response timeout for correlation ID: ${correlationId}`)
        );
      }, timeoutMs);

      this.pendingResponses.set(correlationId, {
        resolve,
        reject,
        timeout,
      });
    });
  }

  @EventPattern(KafkaTopics.DeviceCommandResponses)
  private async handleResponse(@Payload() message: unknown) {
    try {
      const response = AllKafkaMessageSchemas.parse(
        message
      ) as DeviceRpcResponse;
      const pending = this.pendingResponses.get(response.correlationId);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(response.correlationId);
        pending.resolve(response);
      }
    } catch (error) {
      console.error('Failed to handle response:', error);
    }
  }
}

/**
 * =============================================
 * EXAMPLE USAGE
 * =============================================
 */

// Создание и отправка команды
async function exampleSendCommand() {
  const command: DeviceRpcCommand = {
    eventType: 'device.command.rpc',
    correlationId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source: {
      type: 'backend',
      id: 'web-api',
    },
    __version: 'v1',
    timeout: 30000,
    responseRequired: true,
    payload: {
      deviceId: 'device-123',
      method: 'getDeviceState',
      requestedBy: 'user-456',
    },
  };

  await kafkaProducer.sendCommand(command);
}

// Создание и публикация события
async function examplePublishEvent() {
  const event: DeviceBoundEvent = {
    eventType: 'device.bound',
    correlationId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source: {
      type: 'backend',
      id: 'device-service',
    },
    __version: 'v1',
    payload: {
      deviceId: 'device-123',
      userId: 'user-456',
      boundAt: new Date().toISOString(),
      deviceName: 'My IoT Device',
      boundBy: 'user',
    },
  };

  await kafkaProducer.publishEvent(event);
}
