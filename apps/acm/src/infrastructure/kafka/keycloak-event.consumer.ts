import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Consumer, Kafka } from 'kafkajs';
import { KafkaProducer } from './kafka.producer.js';
import {
  type UserCreatedEvent,
  type UserUpdatedEvent,
  type UserDeletedEvent,
  type OrganizationCreatedEvent,
  //type OrganizationMemberAddedEvent,
  KafkaTopics,
} from '@iot-hub/contracts-kafka';
import { ConfigService } from '../../config/config.service.js';
import { UserService } from '../../user/user.service.js';
import { OrganizationsService } from '../../acm/organizations.service.js';
import { KeycloakIntegrationService } from '../keycloak/keycloak-integration.service.js';
import { KafkaConfig } from 'src/config/index.js';

export interface KeycloakUserEvent {
  '@class': string;
  id: string | null;
  time: number;
  type: 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'UPDATE_PROFILE' | 'DELETE_ACCOUNT';
  realmId: string;
  realmName: string | null;
  clientId: string;
  userId: string;
  sessionId: string | null;
  ipAddress: string;
  error: string | null;
  details: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    organizationId?: string;
    registrationType?: 'organization_creator' | 'invited_user';
    auth_method?: string;
    auth_type?: string;
    register_method?: string;
    redirect_uri?: string;
    code_id?: string;
    [key: string]: unknown;
  };
}

export interface KeycloakAdminEvent {
  '@class': string;
  id: string | null;
  time: number;
  realmId: string;
  realmName: string | null;
  authDetails: {
    realmId: string;
    realmName: string;
    clientId: string;
    userId: string;
    ipAddress: string;
  };
  resourceType: 'USER' | 'GROUP' | 'ROLE' | 'CLIENT' | 'REALM';
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTION';
  resourcePath: string;
  representation: string | null;
  error: string | null;
  details: Record<string, unknown> | null;
  resourceTypeAsString: string;
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

  private readonly config: KafkaConfig;
  constructor(
    @InjectPinoLogger(KeycloakEventConsumer.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly kafkaProducer: KafkaProducer,
    private readonly userService: UserService,
    private readonly organizationsService: OrganizationsService,
    private readonly keycloakIntegrationService: KeycloakIntegrationService
  ) {
    this.config = this.configService.kafka.getAll();
    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
    });
    this.consumer = this.kafka.consumer({
      groupId: this.config.groupId,
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

      // Получаем конфигурацию Keycloak топиков
      const keycloakTopics = this.configService.kafka.getKeycloakTopics();

      // Проверяем, какие топики доступны для подписки
      const topicsToSubscribe = [
        keycloakTopics.userEvents,
        keycloakTopics.adminEvents,
        KafkaTopics.AuthEvents,
        // Убираем OrganizationEvents - мы получаем организации только через REGISTER события
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

            // Получаем конфигурацию Keycloak топиков
            const keycloakTopics = this.configService.kafka.getKeycloakTopics();

            switch (topic) {
              case keycloakTopics.userEvents:
              case keycloakTopics.adminEvents:
              case KafkaTopics.AuthEvents:
                await this.handleAuthEvent(eventData);
                break;
              default:
                this.logger.warn(`Unknown topic: ${topic}`);
            }
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}:`, error);
            // Не выбрасываем ошибку, чтобы consumer продолжал работать
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
    this.logger.info(
      `Handling Keycloak user event: ${event.type} for user ${event.userId}`
    );

    try {
      switch (event.type) {
        case 'REGISTER':
          this.logger.info(`Processing user registration for ${event.userId}`);
          try {
            // 1. Создаем пользователя из данных REGISTER события
            const userData = this.extractUserDataFromRegisterEvent(event);

            if (!userData) {
              this.logger.error(
                `Failed to extract user data from REGISTER event for ${event.userId}`
              );
              throw new Error(
                `Could not extract user data from REGISTER event`
              );
            }
            // 2. Проверяем, существует ли пользователь в базе данных
            const existingUser = await this.userService.findByUserId(
              event.userId
            );
            if (existingUser) {
              this.logger.warn(`User ${event.userId} already exists`);
              return;
            }

            // 3. Создаем пользователя в локальной базе данных
            const syncedUser = await this.userService.createUserFromEventData(
              userData
            );

            if (!syncedUser) {
              this.logger.error(
                `Failed to create user ${event.userId} from REGISTER event data`
              );
              throw new Error(
                `User ${event.userId} could not be created from event data`
              );
            }

            this.logger.info(
              `User ${event.userId} successfully created from REGISTER event`
            );

            // 4. Обрабатываем организационную логику в зависимости от типа регистрации
            // Новая логика: различаем создателей организаций и приглашенных пользователей
            if (event.details.organizationId) {
              // Получаем внутренний ID пользователя из базы данных
              const internalUserId =
                await this.userService.getInternalIdByUserId(syncedUser.userId);
              if (!internalUserId) {
                this.logger.error(
                  `Internal ID for user ${syncedUser.userId} not found in database after creation`
                );
                throw new Error(
                  `Internal ID for user ${syncedUser.userId} not found`
                );
              }

              // Проверяем тип регистрации из Keycloak Event Provider
              const registrationType = event.details.registrationType;

              if (registrationType === 'invited_user') {
                // Пользователь приглашен в существующую организацию
                await this.handleInvitedUserRegistration(
                  event.details.organizationId,
                  internalUserId,
                  event.userId
                );
              } else if (registrationType === 'organization_creator') {
                // Пользователь создает новую организацию
                await this.handleOrganizationCreatorRegistration(
                  event.details.organizationId,
                  internalUserId,
                  event.userId
                );
              } else {
                // Fallback: старая логика для обратной совместимости
                this.logger.warn(
                  `Unknown registration type '${registrationType}' for user ${event.userId}, using legacy logic`
                );
                await this.handleLegacyOrganizationRegistration(
                  event.details.organizationId,
                  internalUserId
                );
              }
            }

            // 5. Затем публикуем событие в Kafka для других сервисов
            await this.publishUserCreatedEvent(event);
          } catch (syncError) {
            this.logger.error(
              `Failed to sync user ${event.userId} during REGISTER event:`,
              syncError
            );
            // Выбрасываем ошибку, так как без пользователя нельзя создать организацию
            throw syncError;
          }
          break;
        case 'UPDATE_PROFILE':
          this.logger.info(`Processing profile update for ${event.userId}`);
          try {
            // 1. Синхронизируем обновления пользователя
            await this.userService.syncFromKeycloak(event.userId);
            // 2. Публикуем событие обновления
            await this.publishUserUpdatedEvent(event);
          } catch (syncError) {
            this.logger.error(
              `Failed to sync user ${event.userId} during UPDATE_PROFILE event:`,
              syncError
            );
            // Не выбрасываем ошибку, чтобы не прерывать обработку других сообщений
          }
          break;
        case 'DELETE_ACCOUNT':
          this.logger.info(`Processing account deletion for ${event.userId}`);
          // Публикуем событие удаления (локальное удаление может быть обработано другим способом)
          await this.publishUserDeletedEvent(event);
          break;
        case 'LOGIN':
          // Возможно, в будущем добавим события логина
          this.logger.debug(`User login event for ${event.userId}`);
          break;
        case 'LOGOUT':
          // Возможно, в будущем добавим события логаута
          this.logger.debug(`User logout event for ${event.userId}`);
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
   * Обработка событий авторизации из auth.events.v1 топика
   * Этот метод парсит события Keycloak и определяет их тип
   */
  private async handleAuthEvent(event: Record<string, unknown>): Promise<void> {
    //this.logger.debug('Handling auth event:', event);

    // Логируем полную структуру события для диагностики
    this.logger.info(
      `Full event structure received from Keycloak: ${JSON.stringify(
        {
          eventKeys: Object.keys(event),
          eventType: event.type,
          eventTime: event.time,
          eventDetails: event.details,
          eventOperationType: event.operationType,
          eventResourceType: event.resourceType,
          eventUserId: event.userId,
          representation: event.representation,
          registrationType: (event.details as Record<string, unknown>)
            ?.registrationType,
          fullEvent: event,
        },
        null,
        2
      )}`
    );

    try {
      // Определяем тип события по структуре
      if (this.isKeycloakUserEvent(event)) {
        try {
          await this.handleUserEvent(event as unknown as KeycloakUserEvent);
        } catch (userEventError) {
          this.logger.error('Error handling user event:', userEventError);
          // Не пробрасываем ошибку дальше, чтобы не прерывать работу consumer
        }
      } else if (this.isKeycloakAdminEvent(event)) {
        try {
          await this.handleAdminEvent(event);
        } catch (adminEventError) {
          this.logger.error('Error handling admin event:', adminEventError);
          // Не пробрасываем ошибку дальше, чтобы не прерывать работу consumer
        }
      } else {
        // Обычные auth события (логины, логауты и т.д.)
        this.logger.debug('Processing standard auth event:', event);
      }
    } catch (error) {
      this.logger.error('Error handling auth event:', error);
      // Не выбрасываем ошибку, чтобы не прерывать обработку сообщений
    }
  }

  /**
   * Проверяем, является ли событие пользовательским событием Keycloak
   */
  private isKeycloakUserEvent(event: Record<string, unknown>): boolean {
    return (
      typeof event.type === 'string' &&
      [
        'REGISTER',
        'LOGIN',
        'LOGOUT',
        'UPDATE_PROFILE',
        'DELETE_ACCOUNT',
      ].includes(event.type) &&
      typeof event.userId === 'string' &&
      typeof event.realmId === 'string'
    );
  }

  /**
   * Проверяем, является ли событие административным событием Keycloak
   */
  private isKeycloakAdminEvent(event: Record<string, unknown>): boolean {
    // Проверяем наличие полей Admin Event
    const hasAdminFields =
      typeof event.operationType === 'string' &&
      typeof event.resourceType === 'string' &&
      typeof event.realmId === 'string' &&
      event.representation !== undefined;

    // Дополнительно проверяем класс события
    const isAdminEventClass =
      event['@class'] === 'ru.playa.keycloak.kafka.KeycloakAdminEvent';

    return hasAdminFields || isAdminEventClass;
  }

  /**
   * Обработка административных событий из Keycloak
   */
  private async handleAdminEvent(
    event: Record<string, unknown>
  ): Promise<void> {
    this.logger.debug('Handling admin event:', event);

    try {
      // Обрабатываем создание пользователей через Admin API
      if (
        event.operationType === 'CREATE' &&
        event.resourceType === 'USER' &&
        event.resourcePath &&
        typeof event.resourcePath === 'string'
      ) {
        // Извлекаем ID пользователя из resourcePath (users/USER_ID)
        const userIdMatch = event.resourcePath.match(/users\/([^/]+)/);
        if (userIdMatch && userIdMatch[1]) {
          const userId = userIdMatch[1];
          this.logger.info(
            `Processing Admin Event: CREATE USER for user ${userId}`
          );

          try {
            // Синхронизируем пользователя с локальной базой данных
            const syncedUser = await this.userService.syncFromKeycloak(userId);
            if (syncedUser) {
              this.logger.info(
                `Successfully synced user ${userId} from Admin Event`
              );
            } else {
              this.logger.warn(
                `User ${userId} could not be synced from Keycloak, but continuing`
              );
            }
          } catch (syncError) {
            this.logger.error(
              `Failed to sync user ${userId} from Admin Event:`,
              syncError
            );
            // Не прерываем обработку, продолжаем с публикацией события
          }

          try {
            // Публикуем событие создания пользователя
            await this.publishAdminUserCreatedEvent(event, userId);
            this.logger.info(
              `Successfully published Admin Event for user ${userId}`
            );
          } catch (publishError) {
            this.logger.error(
              `Failed to publish Admin Event for user ${userId}:`,
              publishError
            );
          }
        }
      }

      // Здесь можно обрабатывать другие административные события
      // например, изменения в ролях, группах, настройках и т.д.
    } catch (error) {
      this.logger.error('Error handling admin event:', error);
      throw error;
    }
  }

  /**
   * Обработка регистрации приглашенного пользователя
   */
  private async handleInvitedUserRegistration(
    organizationId: string,
    internalUserId: string,
    keycloakUserId: string
  ): Promise<void> {
    this.logger.info(
      `Processing invited user registration: user ${keycloakUserId} joining organization ${organizationId}`
    );

    try {
      // 1. Ищем организацию в локальной базе по Keycloak ID
      const existingOrgs = await this.organizationsService.findAll({
        search: organizationId,
      });

      const existingOrganization = existingOrgs.organizations.find(
        (org) => org.id === organizationId
      );

      if (!existingOrganization) {
        this.logger.warn(
          `Organization ${organizationId} not found in local database for invited user ${keycloakUserId}`
        );
        // Попробуем синхронизировать организацию из Keycloak
        await this.syncOrganizationFromKeycloak(organizationId);
      }

      // 2. Обновляем пользователя как участника организации (не владельца)
      await this.userService.updateAsOrganizationMember(
        keycloakUserId,
        organizationId
      );

      this.logger.info(
        `Adding invited user ${keycloakUserId} to organization ${organizationId} as member`
      );

      this.logger.info(
        `Successfully added invited user ${keycloakUserId} to organization ${organizationId} as member`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process invited user registration for ${keycloakUserId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Обработка регистрации создателя организации
   */
  private async handleOrganizationCreatorRegistration(
    organizationId: string,
    internalUserId: string,
    keycloakUserId: string
  ): Promise<void> {
    this.logger.info(
      `Processing organization creator registration: user ${keycloakUserId} creating organization ${organizationId}`
    );

    try {
      // 1. Синхронизируем/создаем организацию из Keycloak
      await this.syncOrganizationFromRegisterEvent(
        organizationId,
        internalUserId
      );

      // 2. Делаем пользователя владельцем организации
      await this.userService.updateAsOrganizationOwner(
        internalUserId,
        organizationId
      );

      this.logger.info(
        `Successfully created organization ${organizationId} with owner ${keycloakUserId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process organization creator registration for ${keycloakUserId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fallback: обработка регистрации по старой логике (для обратной совместимости)
   */
  private async handleLegacyOrganizationRegistration(
    organizationId: string,
    internalUserId: string
  ): Promise<void> {
    this.logger.info(
      `Processing legacy organization registration for organization ${organizationId}`
    );

    try {
      // Используем старую логику: создаем организацию и делаем пользователя владельцем
      await this.syncOrganizationFromRegisterEvent(
        organizationId,
        internalUserId
      );
      await this.userService.updateAsOrganizationOwner(
        internalUserId,
        organizationId
      );
    } catch (error) {
      this.logger.error(
        `Failed to process legacy organization registration:`,
        error
      );
      throw error;
    }
  }

  /**
   * Синхронизация организации из Keycloak без создания
   */
  private async syncOrganizationFromKeycloak(
    organizationId: string
  ): Promise<void> {
    try {
      const keycloakOrganization =
        await this.keycloakIntegrationService.getOrganizationById(
          organizationId
        );

      if (!keycloakOrganization) {
        this.logger.warn(
          `Organization not found in Keycloak: ${organizationId}`
        );
        return;
      }

      // Создаем организацию используя существующий метод синхронизации
      await this.organizationsService.syncFromKeycloakEvent({
        organizationId,
        name: keycloakOrganization.name,
        displayName: keycloakOrganization.name,
        domain: undefined,
        ownerId: undefined, // Не указываем владельца при синхронизации
        createdAt: new Date().toISOString(),
        isEnabled: true,
        keycloakId: organizationId,
      });

      this.logger.info(`Synced organization from Keycloak: ${organizationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync organization ${organizationId} from Keycloak:`,
        error
      );
      throw error;
    }
  }

  /**
   * Синхронизация организации из события регистрации пользователя
   */
  private async syncOrganizationFromRegisterEvent(
    organizationId: string,
    ownerId: string // Это ID пользователя в нашей базе данных (users.id), а не Keycloak ID
  ): Promise<void> {
    try {
      // Получаем данные организации из Keycloak
      const keycloakOrganization =
        await this.keycloakIntegrationService.getOrganizationById(
          organizationId
        );

      if (!keycloakOrganization) {
        this.logger.warn(
          `Organization not found in Keycloak: ${organizationId}`
        );
        return;
      }

      // Создаем/синхронизируем организацию
      const createdOrganization =
        await this.organizationsService.syncFromKeycloakEvent({
          organizationId,
          name: keycloakOrganization.name,
          displayName: keycloakOrganization.name,
          domain: undefined,
          ownerId: ownerId, // Внутренний ID пользователя из нашей базы данных
          createdAt: new Date().toISOString(),
          isEnabled: true,
          keycloakId: organizationId,
        });

      this.logger.info(
        `Synced organization from Keycloak: ${organizationId} for owner: ${ownerId}`
      );

      // Обновляем пользователя как владельца организации
      if (createdOrganization) {
        // Получаем пользователя по внутреннему ID
        const ownerUser = await this.userService.findByInternalId(ownerId);

        if (ownerUser) {
          await this.userService.updateAsOrganizationOwner(
            ownerUser.id, // Keycloak ID для поиска в методе update
            createdOrganization.id.toString() // ID созданной организации
          );

          this.logger.info(
            `Updated user ${ownerUser.userId} as owner of organization ${createdOrganization.id}`
          );
        } else {
          this.logger.warn(
            `Owner user not found by internal ID ${ownerId} after organization creation`
          );
        }

        // Публикуем событие создания организации для других сервисов
        await this.publishOrganizationCreatedEvent(
          createdOrganization,
          ownerId
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync organization ${organizationId} from register event:`,
        error
      );
      throw error;
    }
  }

  /**
   * Публикация события создания пользователя через Admin API
   */
  private async publishAdminUserCreatedEvent(
    event: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    try {
      // Парсим представление пользователя из Admin Event
      let userRepresentation: Record<string, unknown> = {};
      if (event.representation && typeof event.representation === 'string') {
        try {
          userRepresentation = JSON.parse(event.representation) as Record<
            string,
            unknown
          >;
        } catch (parseError) {
          this.logger.warn('Failed to parse user representation:', parseError);
        }
      }

      const userCreatedPayload: UserCreatedEvent['payload'] = {
        userId: userId,
        email:
          (userRepresentation.email as string) ||
          `user-${userId}@unknown.local`,
        firstName: (userRepresentation.firstName as string) || '',
        lastName: (userRepresentation.lastName as string) || '',
        organizationId:
          (userRepresentation.attributes as Record<string, string[]>)
            ?.organizationId?.[0] || undefined,
        role: 'user' as const, // По умолчанию роль user
        createdAt: new Date(event.time as number).toISOString(),
        isActive: userRepresentation.enabled !== false,
      };

      // Публикуем через KafkaProducer в правильный топик
      await this.kafkaProducer.publishUserCreated(userCreatedPayload);

      this.logger.info(
        `Published admin user created event for user ${userId} to topic ${KafkaTopics.UserEvents}`
      );

      // Если пользователь создан с организационными атрибутами, обрабатываем их
      const attributes = userRepresentation.attributes as
        | Record<string, string[]>
        | undefined;
      if (attributes?.organizationId?.[0]) {
        this.logger.info(
          `User ${userId} created with organization attributes: ${JSON.stringify(
            attributes
          )}`
        );
        // Примечание: Организации создаются через Keycloak Provider на REGISTER события,
        // Admin Events только создают пользователей без создания организаций
      }
    } catch (error) {
      this.logger.error(`Error publishing admin user created event:`, error);
      throw error;
    }
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
        firstName: event.details.first_name || '',
        lastName: event.details.last_name || '',
        organizationId: event.details.organizationId,
        role: 'user', // По умолчанию роль user
        createdAt: new Date(event.time).toISOString(),
        isActive: true, // При регистрации пользователь активен
      };

      // Публикуем через KafkaProducer в правильный топик
      await this.kafkaProducer.publishUserCreated(userCreatedPayload);

      this.logger.info(
        `Published user created event for user ${event.userId} to topic ${KafkaTopics.UserEvents}`
      );
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
          firstName: event.details.first_name,
          lastName: event.details.last_name,
          enabled: true, // При обновлении профиля пользователь активен
        },
        updatedBy: event.userId, // TODO: получить ID пользователя, который внес изменения
        updatedAt: new Date(event.time).toISOString(),
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
        deletedAt: new Date(event.time).toISOString(),
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
  private async publishOrganizationCreatedEvent(
    organization: {
      id: string;
      name: string;
      domain?: string;
      createdAt: Date;
      isActive: boolean;
    }, // Organization data
    ownerId: string
  ): Promise<void> {
    try {
      const organizationCreatedPayload: OrganizationCreatedEvent['payload'] = {
        organizationId: organization.id,
        name: organization.name,
        displayName: organization.name,
        domain: organization.domain,
        ownerId: ownerId,
        createdAt: organization.createdAt.toISOString(),
        isEnabled: organization.isActive,
        keycloakId: organization.id,
        keycloakEventId: `org-${organization.id}`, // Генерируем уникальный ID события
      };

      // Публикуем через KafkaProducer
      await this.kafkaProducer.publishOrganizationCreated(
        organizationCreatedPayload
      );

      this.logger.info(
        `Published organization created event for organization ${organization.id}`
      );
    } catch (error) {
      this.logger.error(`Error publishing organization created event:`, error);
      throw error;
    }
  }

  /**
   * Публикация события добавления пользователя в организацию
   */
  // private async publishOrganizationMemberAddedEvent(
  //   event: KeycloakUserEvent
  // ): Promise<void> {
  //   try {
  //     if (!event.details.organizationId) {
  //       return;
  //     }

  //     const memberAddedPayload: OrganizationMemberAddedEvent['payload'] = {
  //       organizationId: event.details.organizationId,
  //       userId: event.userId,
  //       role: 'owner', // При создании организации пользователь становится владельцем
  //       addedBy: event.userId, // При регистрации пользователь добавляет себя
  //       addedAt: new Date(event.time).toISOString(),
  //     };

  //     // Публикуем через KafkaProducer
  //     await this.kafkaProducer.publishOrganizationMemberAdded(
  //       memberAddedPayload
  //     );

  //     this.logger.info(
  //       `Published organization member added event for user ${event.userId} in organization ${event.details.organizationId}`
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Error publishing organization member added event:`,
  //       error
  //     );
  //     throw error;
  //   }
  // }

  private extractUserDataFromRegisterEvent(event: KeycloakUserEvent) {
    try {
      const details = event.details || {};

      // Извлекаем данные пользователя из события
      const userData = {
        userId: event.userId,
        email: details.email,
        username: details.username,
        firstName: details.first_name,
        lastName: details.last_name,
      };

      // Проверяем обязательные поля
      if (!userData.email || !userData.username) {
        this.logger.warn(
          `Missing required user data in REGISTER event for ${event.userId}: email=${userData.email}, username=${userData.username}`
        );
        return null;
      }

      this.logger.debug(
        `Extracted user data from REGISTER event: ${JSON.stringify(userData)}`
      );

      return userData;
    } catch (error) {
      this.logger.error(
        `Error extracting user data from REGISTER event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
}
