import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import {
  UserEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  OrganizationEvent,
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationDeletedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberRemovedEvent,
  OrganizationMemberRoleChangedEvent,
  KafkaTopics,
} from '@iot-hub/contracts-kafka';

@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducer.name);
  private producer: Producer;
  private kafka: Kafka;

  constructor(kafkaConfig: { clientId: string; brokers: string[] }) {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer:', error);
    }
  }

  async publishUserCreated(
    payload: UserCreatedEvent['payload']
  ): Promise<void> {
    const event: UserCreatedEvent = {
      eventType: 'user.created',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'user-management-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(KafkaTopics.UserEvents, event, payload.userId);
  }

  async publishUserUpdated(
    payload: UserUpdatedEvent['payload']
  ): Promise<void> {
    const event: UserUpdatedEvent = {
      eventType: 'user.updated',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'user-management-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(KafkaTopics.UserEvents, event, payload.userId);
  }

  async publishUserDeleted(
    payload: UserDeletedEvent['payload']
  ): Promise<void> {
    const event: UserDeletedEvent = {
      eventType: 'user.deleted',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'user-management-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(KafkaTopics.UserEvents, event, payload.userId);
  }

  async publishOrganizationCreated(
    payload: OrganizationCreatedEvent['payload']
  ): Promise<void> {
    const event: OrganizationCreatedEvent = {
      eventType: 'organization.created',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  async publishOrganizationUpdated(
    payload: OrganizationUpdatedEvent['payload']
  ): Promise<void> {
    const event: OrganizationUpdatedEvent = {
      eventType: 'organization.updated',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  async publishOrganizationDeleted(
    payload: OrganizationDeletedEvent['payload']
  ): Promise<void> {
    const event: OrganizationDeletedEvent = {
      eventType: 'organization.deleted',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  async publishOrganizationMemberAdded(
    payload: OrganizationMemberAddedEvent['payload']
  ): Promise<void> {
    const event: OrganizationMemberAddedEvent = {
      eventType: 'organization.member.added',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  async publishOrganizationMemberRemoved(
    payload: OrganizationMemberRemovedEvent['payload']
  ): Promise<void> {
    const event: OrganizationMemberRemovedEvent = {
      eventType: 'organization.member.removed',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  async publishOrganizationMemberRoleChanged(
    payload: OrganizationMemberRoleChangedEvent['payload']
  ): Promise<void> {
    const event: OrganizationMemberRoleChangedEvent = {
      eventType: 'organization.member.role-changed',
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      source: {
        type: 'backend',
        id: 'acm-service',
        version: '1.0.0',
      },
      __version: 'v1',
      payload,
    };

    await this.publishEvent(
      KafkaTopics.OrganizationEvents,
      event,
      payload.organizationId
    );
  }

  private async publishEvent(
    topic: string,
    event: UserEvent | OrganizationEvent,
    key: string
  ): Promise<void> {
    try {
      const message = {
        key,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.eventType,
          'content-type': 'application/json',
          'source-type': event.source.type,
          'source-id': event.source.id,
        },
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      this.logger.log(`Published event: ${event.eventType}`, {
        correlationId: event.correlationId,
        eventType: event.eventType,
        sourceId: event.source.id,
      });
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, error, {
        correlationId: event.correlationId,
        eventType: event.eventType,
        sourceId: event.source.id,
      });
      throw error;
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
