import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service.js';
import {
  DeviceEvent,
  DeviceCommand,
  DeviceTelemetryReceivedEvent,
  DeviceAlertRaisedEvent,
  KafkaTopics,
} from '@iot-hub/contracts-kafka';

@Injectable()
export class DeviceEventService {
  private readonly logger = new Logger(DeviceEventService.name);

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async publishDeviceEvent(event: DeviceEvent): Promise<void> {
    try {
      await this.kafkaProducer.sendEvent(
        KafkaTopics.DeviceEvents,
        event.payload.deviceId,
        event
      );
      this.logger.debug(
        `✅ Device event published: ${event.eventType} for device ${event.payload.deviceId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish device event for ${event.payload.deviceId}`,
        error
      );
      throw error;
    }
  }

  async publishDeviceCommand(command: DeviceCommand): Promise<void> {
    try {
      await this.kafkaProducer.sendEvent(
        KafkaTopics.DeviceCommands,
        command.payload.deviceId,
        command
      );
      this.logger.debug(
        `✅ Device command published: ${command.eventType} for device ${command.payload.deviceId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish device command for ${command.payload.deviceId}`,
        error
      );
      throw error;
    }
  }

  async publishTelemetry(
    telemetry: DeviceTelemetryReceivedEvent
  ): Promise<void> {
    try {
      await this.kafkaProducer.sendEvent(
        KafkaTopics.DeviceTelemetry,
        telemetry.payload.deviceId,
        telemetry
      );
      this.logger.debug(
        `✅ Telemetry published for device ${telemetry.payload.deviceId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish telemetry for ${telemetry.payload.deviceId}`,
        error
      );
      throw error;
    }
  }

  async publishAlert(alert: DeviceAlertRaisedEvent): Promise<void> {
    try {
      await this.kafkaProducer.sendEvent(
        KafkaTopics.DeviceAlerts,
        alert.payload.deviceId,
        alert
      );
      this.logger.log(
        `🚨 Alert published: ${alert.eventType} for device ${alert.payload.deviceId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish alert for ${alert.payload.deviceId}`,
        error
      );
      throw error;
    }
  }
}
