import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Consumer, Kafka } from 'kafkajs';
import { KafkaProducer } from './kafka.producer.js';
import {
  type UserCreatedEvent,
  type UserUpdatedEvent,
  type UserDeletedEvent,
  type OrganizationCreatedEvent,
  type OrganizationMemberAddedEvent,
  KafkaTopics,
  ConsumerGroups,
} from '@iot-hub/contracts-kafka';
import { ConfigService } from '../../config/config.service.js';
import { UserService } from '../../user/user.service.js';

export interface KeycloakUserEvent {
  type: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_LOGIN';
  userId: string;
  timestamp: string;
  realmId: string;
  details: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    roles?: string[];
    groups?: string[];
    attributes?: Record<string, string[]>;
    organizationId?: string;
    organizationName?: string;
    organizationDomain?: string;
  };
}

export interface KeycloakRoleEvent {
  type:
    | 'ROLE_CREATED'
    | 'ROLE_UPDATED'
    | 'ROLE_DELETED'
    | 'ROLE_ASSIGNED'
    | 'ROLE_REMOVED';
  roleId: string;
  roleName: string;
  userId?: string;
  timestamp: string;
  realmId: string;
}

export interface KeycloakGroupEvent {
  type:
    | 'GROUP_CREATED'
    | 'GROUP_UPDATED'
    | 'GROUP_DELETED'
    | 'GROUP_MEMBERSHIP_UPDATED';
  groupId: string;
  groupName: string;
  userId?: string;
  timestamp: string;
  realmId: string;
  details: {
    path?: string;
    parentId?: string;
    attributes?: Record<string, string[]>;
  };
}

@Injectable()
export class KeycloakEventConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private kafka: Kafka;

  // Топики для Keycloak событий (входящие)
  private readonly keycloakTopics = {
    userEvents: 'keycloak.user.events',
    adminEvents: 'keycloak.admin.events',
  } as const;

  constructor(
    @InjectPinoLogger(KeycloakEventConsumer.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly kafkaProducer: KafkaProducer,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {
    const kafkaOptions = this.configService.kafka.getKafkaOptions();

    // Создаем Kafka конфигурацию с правильными типами
    const kafkaConfig: import('kafkajs').KafkaConfig = {
      clientId: kafkaOptions.clientId,
      brokers: kafkaOptions.brokers,
      ssl: kafkaOptions.ssl || false,
      connectionTimeout: kafkaOptions.connectionTimeout,
      requestTimeout: kafkaOptions.requestTimeout,
      retry: kafkaOptions.retry,
      // SASL пропускаем пока что, так как в разработке он не нужен
    };

    this.kafka = new Kafka(kafkaConfig);

    const consumerConfig = this.configService.kafka.getConsumerConfig();
    this.consumer = this.kafka.consumer({
      groupId: ConsumerGroups.AuthService, // Используем групп-консьюмер для авторизации
      maxWaitTimeInMs: consumerConfig.maxWaitTimeInMs,
      sessionTimeout: consumerConfig.sessionTimeout,
      heartbeatInterval: consumerConfig.heartbeatInterval,
    });
  }

  async onModuleInit() {
    if (!this.configService.kafka.isEnabled()) {
      this.logger.info('Kafka is disabled, skipping consumer initialization');
      return;
    }

    try {
      await this.consumer.connect();
      this.logger.info('Kafka consumer connected');

      // Получаем список доступных топиков для проверки их существования
      const admin = this.kafka.admin();
      await admin.connect();

      const availableTopics = await admin.listTopics();
      await admin.disconnect();

      // Проверяем, какие топики доступны для подписки
      const topicsToSubscribe = [
        this.keycloakTopics.userEvents,
        this.keycloakTopics.adminEvents,
        KafkaTopics.AuthEvents,
      ].filter((topic) => {
        const exists = availableTopics.includes(topic);
        if (!exists) {
          this.logger.warn(
            `Topic ${topic} does not exist, skipping subscription`
          );
        }
        return exists;
      });

      if (topicsToSubscribe.length === 0) {
        this.logger.warn(
          'No topics available for subscription, consumer will not process any messages'
        );
        return;
      }

      // Подписываемся только на существующие топики
      await this.consumer.subscribe({
        topics: topicsToSubscribe,
        fromBeginning: false,
      });

      this.logger.info(`Subscribed to topics: ${topicsToSubscribe.join(', ')}`);

      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            if (!message.value) {
              this.logger.warn('Received empty message');
              return;
            }

            const eventData = JSON.parse(message.value.toString());
            this.logger.debug(
              `Processing event from topic ${topic}:`,
              eventData
            );

            switch (topic) {
              case this.keycloakTopics.userEvents:
                await this.handleUserEvent(eventData);
                break;
              case this.keycloakTopics.adminEvents:
                await this.handleAdminEvent(eventData);
                break;
              case KafkaTopics.AuthEvents:
                await this.handleAuthEvent(eventData);
                break;
              default:
                this.logger.warn(`Unknown topic: ${topic}`);
            }
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}:`, error);
            // В продакшене здесь можно добавить retry логику или dead letter queue
          }
        },
      });

      this.logger.info(
        'Kafka consumer is running and listening for Keycloak events'
      );
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer:', error);
      // В разработке не останавливаем приложение из-за проблем с Kafka
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    if (!this.configService.kafka.isEnabled()) {
      return;
    }

    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.info('Kafka consumer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer:', error);
      // Не выбрасываем ошибку при отключении
    }
  }

  /**
   * Обработка пользовательских событий из Keycloak
   */
  private async handleUserEvent(event: KeycloakUserEvent): Promise<void> {
    this.logger.debug(
      `Handling user event: ${event.type} for user ${event.userId}`
    );

    try {
      switch (event.type) {
        case 'USER_CREATED':
          // 1. Синхронизируем пользователя с локальной базой данных
          await this.userService.syncFromKeycloak(event.userId);
          // 2. Публикуем событие в Kafka для других сервисов
          await this.publishUserCreatedEvent(event);
          break;
        case 'USER_UPDATED':
          // 1. Синхронизируем обновления пользователя
          await this.userService.syncFromKeycloak(event.userId);
          // 2. Публикуем событие обновления
          await this.publishUserUpdatedEvent(event);
          break;
        case 'USER_DELETED':
          // Публикуем событие удаления (локальное удаление может быть обработано другим способом)
          await this.publishUserDeletedEvent(event);
          break;
        case 'USER_LOGIN':
          // Возможно, в будущем добавим события логина
          this.logger.debug(`User login event for ${event.userId}`);
          break;
        default:
          this.logger.warn(`Unhandled user event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling user event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Обработка событий авторизации
   */
  private async handleAuthEvent(event: Record<string, unknown>): Promise<void> {
    this.logger.debug('Handling auth event:', event);

    // Здесь можно обрабатывать события из auth.events.v1 топика
    // например, логины, логауты, изменения сессий и т.д.
  }

  /**
   * Обработка административных событий из Keycloak
   */
  private async handleAdminEvent(
    event: Record<string, unknown>
  ): Promise<void> {
    this.logger.debug('Handling admin event:', event);

    // Здесь можно обрабатывать административные события
    // например, изменения в ролях, группах, настройках и т.д.
  }

  /**
   * Публикация события создания пользователя
   */
  private async publishUserCreatedEvent(
    event: KeycloakUserEvent
  ): Promise<void> {
    try {
      const userCreatedPayload: UserCreatedEvent['payload'] = {
        userId: event.userId,
        email: event.details.email || '',
        firstName: event.details.firstName || '',
        lastName: event.details.lastName || '',
        organizationId: event.details.organizationId,
        role: 'user', // По умолчанию роль user
        createdAt: event.timestamp,
        isActive: event.details.enabled ?? true,
      };

      // Публикуем через KafkaProducer в правильный топик
      await this.kafkaProducer.publishUserCreated(userCreatedPayload);

      this.logger.info(
        `Published user created event for user ${event.userId} to topic ${KafkaTopics.UserEvents}`
      );

      // Если есть данные об организации, публикуем события организации
      if (event.details.organizationId && event.details.organizationName) {
        await this.publishOrganizationCreatedEvent(event);
        await this.publishOrganizationMemberAddedEvent(event);
      }
    } catch (error) {
      this.logger.error(`Error publishing user created event:`, error);
      throw error;
    }
  }

  /**
   * Публикация события обновления пользователя
   */
  private async publishUserUpdatedEvent(
    event: KeycloakUserEvent
  ): Promise<void> {
    try {
      const userUpdatedPayload: UserUpdatedEvent['payload'] = {
        userId: event.userId,
        previousData: {}, // TODO: получить предыдущие данные
        newData: {
          email: event.details.email,
          firstName: event.details.firstName,
          lastName: event.details.lastName,
          enabled: event.details.enabled,
        },
        updatedBy: event.userId, // TODO: получить ID пользователя, который внес изменения
        updatedAt: event.timestamp,
        changes: [], // TODO: вычислить изменения
      };

      // Публикуем через KafkaProducer в правильный топик
      await this.kafkaProducer.publishUserUpdated(userUpdatedPayload);

      this.logger.info(
        `Published user updated event for user ${event.userId} to topic ${KafkaTopics.UserEvents}`
      );
    } catch (error) {
      this.logger.error(`Error publishing user updated event:`, error);
      throw error;
    }
  }

  /**
   * Публикация события удаления пользователя
   */
  private async publishUserDeletedEvent(
    event: KeycloakUserEvent
  ): Promise<void> {
    try {
      const userDeletedPayload: UserDeletedEvent['payload'] = {
        userId: event.userId,
        email: event.details.email || '',
        deletedBy: event.userId, // TODO: получить ID пользователя, который удалил
        deletedAt: event.timestamp,
        hardDelete: false, // Обычно мы делаем мягкое удаление
        devicesCount: 0, // TODO: получить количество устройств пользователя
        reason: 'Deleted in Keycloak',
      };

      // Публикуем через KafkaProducer в правильный топик
      await this.kafkaProducer.publishUserDeleted(userDeletedPayload);

      this.logger.info(
        `Published user deleted event for user ${event.userId} to topic ${KafkaTopics.UserEvents}`
      );
    } catch (error) {
      this.logger.error(`Error publishing user deleted event:`, error);
      throw error;
    }
  }

  /**
   * Публикация события создания организации
   */
  private async publishOrganizationCreatedEvent(event: KeycloakUserEvent): Promise<void> {
    try {
      if (!event.details.organizationId || !event.details.organizationName) {
        return;
      }

      const organizationCreatedPayload: OrganizationCreatedEvent['payload'] = {
        organizationId: event.details.organizationId,
        name: event.details.organizationName,
        displayName: event.details.organizationName,
        domain: event.details.organizationDomain,
        ownerId: event.userId,
        createdAt: event.timestamp,
        isEnabled: true,
        keycloakId: event.details.organizationId,
        keycloakEventId: event.userId, // ID события Keycloak
      };

      // Публикуем через KafkaProducer
      await this.kafkaProducer.publishOrganizationCreated(organizationCreatedPayload);

      this.logger.info(`Published organization created event for organization ${event.details.organizationId}`);
    } catch (error) {
      this.logger.error(`Error publishing organization created event:`, error);
      throw error;
    }
  }

  /**
   * Публикация события добавления пользователя в организацию
   */
  private async publishOrganizationMemberAddedEvent(event: KeycloakUserEvent): Promise<void> {
    try {
      if (!event.details.organizationId) {
        return;
      }

      const memberAddedPayload: OrganizationMemberAddedEvent['payload'] = {
        organizationId: event.details.organizationId,
        userId: event.userId,
        role: 'owner', // При создании организации пользователь становится владельцем
        addedBy: event.userId, // При регистрации пользователь добавляет себя
        addedAt: event.timestamp,
      };

      // Публикуем через KafkaProducer
      await this.kafkaProducer.publishOrganizationMemberAdded(memberAddedPayload);

      this.logger.info(`Published organization member added event for user ${event.userId} in organization ${event.details.organizationId}`);
    } catch (error) {
      this.logger.error(`Error publishing organization member added event:`, error);
      throw error;
    }
  }
}
