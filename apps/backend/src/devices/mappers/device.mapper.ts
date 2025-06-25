import type { Device } from '@iot-hub/devices';
import { Device as DeviceEntity } from '../entities/device.entity';

/**
 * Маппер для преобразования сущности Device в DTO
 * Использует унифицированную схему Device
 */
export class DeviceMapper {
  /**
   * Преобразует сущность Device в унифицированный Device DTO
   */
  static toDto(entity: DeviceEntity): Device {
    return {
      deviceId: entity.id, // Маппинг id -> deviceId
      model: entity.model,
      publicKeyPem: entity.publicKey, // Маппинг publicKey -> publicKeyPem
      ownerId: entity.ownerId,
      status: entity.status as 'unbound' | 'bound' | 'revoked',
      lastSeenAt: entity.lastSeenAt,
      firmwareVersion: entity.firmwareVersion || undefined,
      createdAt: entity.createdAt,
      boundAt: entity.boundAt || null,
      bindingTokenExpiresAt: entity.bindingTokenExpiresAt || null,
    };
  }

  /**
   * Преобразует массив сущностей Device в массив унифицированных Device DTO
   */
  static toDtoArray(entities: DeviceEntity[]): Device[] {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * Преобразует сущность Device в упрощенный User Device DTO
   * Используется для пользовательских списков устройств
   */
  static toUserDeviceDto(entity: DeviceEntity) {
    return {
      deviceId: entity.id,
      model: entity.model || undefined,
      status: entity.status === 'revoked' ? 'suspended' as const : entity.status as 'bound' | 'suspended',
      boundAt: entity.boundAt || entity.createdAt, // Fallback на createdAt если boundAt не установлен
      lastSeenAt: entity.lastSeenAt,
    };
  }

  /**
   * Преобразует массив сущностей Device в массив упрощенных User Device DTO
   */
  static toUserDeviceDtoArray(entities: DeviceEntity[]) {
    return entities.map((entity) => this.toUserDeviceDto(entity));
  }
}
