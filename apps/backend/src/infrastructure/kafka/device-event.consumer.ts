import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { KafkaConsumerService } from './kafka-consumer.service.js';
import { KafkaTopics, AllKafkaEvent } from '@iot-hub/contracts-kafka';
import type { Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class DeviceEventConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer | null = null;

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    @InjectPinoLogger(DeviceEventConsumer.name)
    private readonly logger: PinoLogger
  ) {}

  async onModuleInit() {
    this.logger.info('🚀 Starting Device Event Consumer...');

    try {
      // Создаем консьюмер для группы device-events
      this.consumer = await this.kafkaConsumer.createConsumer('device-events');

      // Подписываемся на топики device events
      const topics = [
        KafkaTopics.DeviceEvents,
        KafkaTopics.DeviceTelemetry,
        KafkaTopics.DeviceCommands,
      ];

      await this.kafkaConsumer.subscribeToTopics(
        this.consumer,
        topics,
        this.handleMessage.bind(this)
      );

      this.logger.info('✅ Device Event Consumer started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start Device Event Consumer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.info('🛑 Stopping Device Event Consumer...');

    if (this.consumer) {
      try {
        await this.consumer.disconnect();
        this.logger.info('✅ Device Event Consumer stopped');
      } catch (error) {
        this.logger.error('❌ Error stopping Device Event Consumer', error);
      }
    }
  }

  /**
   * Обработчик сообщений Kafka
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const event = await this.kafkaConsumer.parseMessage<AllKafkaEvent>(
        payload
      );

      if (!event) {
        this.logger.warn('📦 Received empty or invalid message');
        return;
      }

      const { eventType } = event;
      this.logger.debug(`📥 Processing ${eventType} event`);

      // Диспетчеризация событий
      switch (eventType) {
        case 'device.registered':
          await this.handleDeviceRegistered(event);
          break;
        case 'device.bound':
          await this.handleDeviceBound(event);
          break;
        case 'device.unbound':
          await this.handleDeviceUnbound(event);
          break;
        case 'device.status.changed':
          await this.handleDeviceStatusChanged(event);
          break;
        case 'device.deleted':
          await this.handleDeviceDeleted(event);
          break;
        case 'device.telemetry.received':
          await this.handleDeviceTelemetryReceived(event);
          break;
        default:
          this.logger.debug(`🤷 Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error('❌ Error processing message', error);
    }
  }

  /**
   * Обработка события регистрации устройства
   */
  private async handleDeviceRegistered(event: AllKafkaEvent) {
    if (event.eventType !== 'device.registered') return;

    const { payload } = event;

    this.logger.info(
      `🆕 Device registered: ${payload.deviceId} (model: ${payload.model})`
    );

    // Здесь можно добавить бизнес-логику:
    // - Отправка уведомлений
    // - Обновление кэша
    // - Инициализация мониторинга устройства
    // - Создание метрик в OpenTelemetry
  }

  /**
   * Обработка события привязки устройства
   */
  private async handleDeviceBound(event: AllKafkaEvent) {
    if (event.eventType !== 'device.bound') return;

    const { payload } = event;

    this.logger.info(
      `🔗 Device bound: ${payload.deviceId} to user: ${payload.userId}`
    );

    // Бизнес-логика для привязки:
    // - Отправка welcome email пользователю
    // - Настройка уведомлений
    // - Создание dashboard для пользователя
    // - Инициализация персональных настроек
  }

  /**
   * Обработка события отвязки устройства
   */
  private async handleDeviceUnbound(event: AllKafkaEvent) {
    if (event.eventType !== 'device.unbound') return;

    const { payload } = event;

    this.logger.info(
      `🔓 Device unbound: ${payload.deviceId} from user: ${payload.previousUserId}`
    );

    // Бизнес-логика для отвязки:
    // - Отправка уведомления об отвязке
    // - Очистка персональных данных
    // - Остановка уведомлений
    // - Архивирование пользовательских настроек
  }

  /**
   * Обработка события изменения статуса устройства
   */
  private async handleDeviceStatusChanged(event: AllKafkaEvent) {
    if (event.eventType !== 'device.status.changed') return;

    const { payload } = event;

    this.logger.info(
      `🔄 Device status changed: ${payload.deviceId} (${payload.previousStatus} → ${payload.currentStatus})`
    );

    // Бизнес-логика для изменения статуса:
    // - Обновление real-time dashboard
    // - Отправка уведомлений о критических статусах
    // - Запуск алертов при переходе в error
    // - Обновление метрик доступности

    if (payload.currentStatus === 'error') {
      this.logger.warn(
        `⚠️ Device ${payload.deviceId} went into error state: ${
          payload.reason || 'Unknown reason'
        }`
      );
      // Здесь можно отправить критическое уведомление
    }
  }

  /**
   * Обработка события удаления устройства
   */
  private async handleDeviceDeleted(event: AllKafkaEvent) {
    if (event.eventType !== 'device.deleted') return;

    const { payload } = event;

    this.logger.info(
      `🗑️ Device deleted: ${payload.deviceId} by: ${payload.deletedBy}`
    );

    // Бизнес-логика для удаления:
    // - Очистка связанных данных
    // - Уведомление пользователей
    // - Остановка мониторинга
    // - Архивирование исторических данных
  }

  /**
   * Обработка события получения телеметрии
   */
  private async handleDeviceTelemetryReceived(event: AllKafkaEvent) {
    if (event.eventType !== 'device.telemetry.received') return;

    const { payload } = event;

    this.logger.debug(`📊 Telemetry received from device: ${payload.deviceId}`);

    // Бизнес-логика для телеметрии:
    // - Сохранение в time-series database
    // - Обновление real-time metrics
    // - Проверка thresholds и алертов
    // - Обновление device status на online
  }
}
