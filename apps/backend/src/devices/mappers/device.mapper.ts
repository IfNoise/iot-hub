import type { DeviceBase } from '@iot-hub/devices';
import { Device as DeviceEntity } from '../entities/device.entity';

/**
 * Маппер для преобразования сущности Device в DTO
 */
export class DeviceMapper {
  /**
   * Преобразует сущность Device в Device DTO
   */
  static toDto(entity: DeviceEntity): DeviceBase {
    return {
      id: entity.id,
      model: entity.model,
      publicKey: entity.publicKey,
      ownerId: entity.ownerId,
      status: entity.status as 'unbound' | 'bound' | 'revoked',
      lastSeenAt: entity.lastSeenAt,
      firmwareVersion: entity.firmwareVersion || undefined,
      createdAt: entity.createdAt,
    };
  }

  /**
   * Преобразует массив сущностей Device в массив Device DTO
   */
  static toDtoArray(entities: DeviceEntity[]): DeviceBase[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
