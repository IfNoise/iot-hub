import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { BindDeviceWithOwnerDto } from './dto/bind-device.dto.js';
import { DeviceEventService } from '../infrastructure/kafka/device-event.service.js';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    private readonly deviceEventService: DeviceEventService
  ) {}

  /**
   * Создает новое устройство БЕЗ сертификата
   * Сертификат создается отдельно через CSR API
   */
  async createDevice(dto: CreateDeviceDto) {
    // Проверяем, что устройство с таким ID еще не существует
    const existingDevice = await this.deviceRepo.findOne({
      where: { id: dto.deviceId },
    });

    if (existingDevice) {
      throw new Error(`Device with ID ${dto.deviceId} already exists`);
    }

    // Создаем устройство БЕЗ сертификата
    const device = new Device();
    device.id = dto.deviceId;
    device.model = dto.model || '';
    device.publicKey = dto.publicKeyPem; // Унифицированное поле
    device.ownerId = null;
    device.status = 'unbound';
    device.lastSeenAt = new Date();
    device.firmwareVersion = dto.firmwareVersion || undefined;

    // Сохраняем устройство (сертификат будет создан отдельно через CSR API)
    const savedDevice = await this.deviceRepo.save(device);

    // 📤 Публикуем событие device.registered в Kafka
    try {
      await this.deviceEventService.publishDeviceEvent({
        eventType: 'device.registered',
        correlationId: `reg_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'devices-service',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: savedDevice.id,
          manufacturerId: 'default-manufacturer', // TODO: получать из DTO
          model: savedDevice.model,
          firmwareVersion: savedDevice.firmwareVersion || 'unknown',
          hardwareRevision: undefined,
          serialNumber: undefined,
          capabilities: [],
          registeredBy: 'system',
          registeredAt: savedDevice.createdAt.toISOString(),
          metadata: {
            publicKey: savedDevice.publicKey,
          },
        },
      });

      this.logger.log(
        `✅ Device registered event published for device: ${savedDevice.id}`
      );
    } catch (eventError) {
      this.logger.error(
        `❌ Failed to publish device registered event for ${savedDevice.id}`,
        eventError
      );
      // Не прерываем выполнение, событие не критично для создания устройства
    }

    return savedDevice;
  }

  /**
   * Привязывает устройство к владельцу.
   * @param deviceId - Идентификатор устройства.
   * @param ownerId - Идентификатор владельца.
   * @returns Обновленное устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено или уже привязано к другому владельцу.
   */

  async bindDevice(dto: BindDeviceWithOwnerDto) {
    // Находим устройство по id
    const device = await this.deviceRepo.findOne({
      where: { id: dto.id },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${dto.id} not found`);
    }
    // Проверяем, что устройство не привязано к другому владельцу
    if (device.ownerId) {
      throw new Error(
        `Device with ID ${dto.id} is already bound to another owner`
      );
    }
    // Обновляем владельца устройства
    device.ownerId = dto.ownerId;
    device.status = 'bound';
    device.lastSeenAt = new Date();
    // Сохраняем обновленное устройство
    const updatedDevice = await this.deviceRepo.save(device);

    // 📤 Публикуем событие device.bound в Kafka
    try {
      await this.deviceEventService.publishDeviceEvent({
        eventType: 'device.bound',
        correlationId: `bind_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'devices-service',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: updatedDevice.id,
          userId: updatedDevice.ownerId || dto.ownerId,
          organizationId: undefined, // TODO: добавить поддержку организаций
          boundAt: updatedDevice.lastSeenAt.toISOString(),
          deviceName: undefined, // TODO: добавить поле deviceName
          boundBy: 'user',
        },
      });

      this.logger.log(
        `✅ Device bound event published for device: ${updatedDevice.id} to user: ${updatedDevice.ownerId}`
      );
    } catch (eventError) {
      this.logger.error(
        `❌ Failed to publish device bound event for ${updatedDevice.id}`,
        eventError
      );
    }

    return {
      device: updatedDevice,
      certificate: device.certificate,
    };
  }

  /**
   * Отвязывает устройство от владельца.
   * @param deviceId - Идентификатор устройства.
   * @param userId - ID пользователя (владельца), который отвязывает устройство.
   * @returns Обновленное устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено, уже отвязано или пользователь не является владельцем.
   */

  async unbindDevice(deviceId: string, userId?: string) {
    // Находим устройство по id
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    // Проверяем, что устройство привязано к владельцу
    if (!device.ownerId) {
      throw new Error(`Device with ID ${deviceId} is already unbound`);
    }
    // Если передан userId, проверяем, что пользователь является владельцем устройства
    if (userId && device.ownerId !== userId) {
      throw new Error(`User ${userId} is not the owner of device ${deviceId}`);
    }

    // Сохраняем предыдущего владельца для события
    const previousUserId = device.ownerId;

    // Отвязываем устройство от владельца
    device.ownerId = null;
    device.status = 'unbound';
    device.lastSeenAt = new Date();
    // Сохраняем обновленное устройство
    const updatedDevice = await this.deviceRepo.save(device);

    // 📤 Публикуем событие device.unbound в Kafka
    try {
      await this.deviceEventService.publishDeviceEvent({
        eventType: 'device.unbound',
        correlationId: `unbind_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'devices-service',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: updatedDevice.id,
          previousUserId: previousUserId || 'unknown',
          unboundAt: updatedDevice.lastSeenAt.toISOString(),
          reason: 'Manual unbind',
          unboundBy: userId ? 'user' : 'admin',
        },
      });

      this.logger.log(
        `✅ Device unbound event published for device: ${updatedDevice.id} from user: ${previousUserId}`
      );
    } catch (eventError) {
      this.logger.error(
        `❌ Failed to publish device unbound event for ${updatedDevice.id}`,
        eventError
      );
    }

    return {
      device: updatedDevice,
      certificate: device.certificate,
    };
  }

  /**
   * Получает список устройств с их сертификатами.
   * с пагинацией и фильтрацией.
   * @returns Список устройств с сертификатами и мета-информацией.
   */
  async getDevices({ page = 1, limit = 10 } = {}) {
    const [devices, total] = await this.deviceRepo.findAndCount({
      relations: ['certificate'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      devices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Получает устройство по его идентификатору.
   * @param deviceId - Идентификатор устройства.
   * @returns Устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено.
   */
  async getDeviceById(deviceId: string) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    return device;
  }

  /**
   * Получает список устройств пользователя по его идентификатору.
   * @param ownerId - Идентификатор владельца.
   * @param options - Параметры пагинации.
   * @returns Список устройств пользователя с сертификатами и мета-информацией.
   */
  async getUserDevices(ownerId: string, { page = 1, limit = 10 } = {}) {
    const [devices, total] = await this.deviceRepo.findAndCount({
      where: { ownerId },
      relations: ['certificate'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      devices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Обновляет устройство по его идентификатору.
   * @param deviceId - Идентификатор устройства.
   * @param updateData - Данные для обновления устройства.
   * @returns Обновленное устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено.
   */
  async updateDevice(deviceId: string, updateData: Partial<Device>) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    // Обновляем устройство
    Object.assign(device, updateData);
    const updatedDevice = await this.deviceRepo.save(device);
    return {
      device: updatedDevice,
      certificate: updatedDevice.certificate,
    };
  }

  /**
   * Удаляет устройство по его идентификатору.
   * @param deviceId - Идентификатор устройства.
   * @param deletedBy - ID пользователя, который удаляет устройство.
   * @returns Удаленное устройство.
   * @throws Ошибка, если устройство не найдено.
   */
  async deleteDevice(deviceId: string, deletedBy?: string) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    // Сохраняем данные для события перед удалением
    const wasManufacturingDevice = device.status === 'unbound';
    const wasBoundToUser = !!device.ownerId;
    const lastUserId = device.ownerId;

    // Удаляем устройство и его сертификат (каскадно)
    await this.deviceRepo.delete({ id: deviceId });

    // 📤 Публикуем событие device.deleted в Kafka
    try {
      await this.deviceEventService.publishDeviceEvent({
        eventType: 'device.deleted',
        correlationId: `del_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'devices-service',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: device.id,
          deletedBy: deletedBy || 'system',
          deletedAt: new Date().toISOString(),
          reason: 'Manual deletion',
          wasManufacturingDevice,
          wasBoundToUser,
          lastUserId: lastUserId || undefined,
        },
      });

      this.logger.log(
        `✅ Device deleted event published for device: ${device.id}`
      );
    } catch (eventError) {
      this.logger.error(
        `❌ Failed to publish device deleted event for ${device.id}`,
        eventError
      );
    }

    return device;
  }

  /**
   * Обновляет статус устройства (online/offline/error/sleep/maintenance)
   * @param deviceId - Идентификатор устройства
   * @param newStatus - Новый статус устройства
   * @param reason - Причина изменения статуса
   * @param metadata - Дополнительная информация (батарея, сигнал и т.д.)
   */
  async updateDeviceStatus(
    deviceId: string,
    newStatus: 'online' | 'offline' | 'error' | 'sleep' | 'maintenance',
    reason?: string,
    metadata?: {
      lastSeen?: string;
      batteryLevel?: number;
      signalStrength?: number;
      temperature?: number;
    }
  ) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    // Получаем предыдущий статус из поля status (если он там хранится)
    // Если нет, то используем 'unknown'
    const previousStatus = this.mapDeviceStatusToKafkaStatus(device.status);

    // Обновляем lastSeenAt независимо от статуса
    device.lastSeenAt = new Date();
    const updatedDevice = await this.deviceRepo.save(device);

    // 📤 Публикуем событие device.status.changed в Kafka
    try {
      await this.deviceEventService.publishDeviceEvent({
        eventType: 'device.status.changed',
        correlationId: `status_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: {
          type: 'backend',
          id: 'devices-service',
          version: '1.0.0',
        },
        __version: 'v1',
        payload: {
          deviceId: updatedDevice.id,
          previousStatus: previousStatus as
            | 'online'
            | 'offline'
            | 'error'
            | 'sleep'
            | 'maintenance',
          currentStatus: newStatus,
          changedAt: updatedDevice.lastSeenAt.toISOString(),
          reason: reason || 'Status update',
          metadata: metadata,
        },
      });

      this.logger.log(
        `✅ Device status changed event published for device: ${updatedDevice.id} (${previousStatus} → ${newStatus})`
      );
    } catch (eventError) {
      this.logger.error(
        `❌ Failed to publish device status changed event for ${updatedDevice.id}`,
        eventError
      );
    }

    return updatedDevice;
  }

  /**
   * Маппинг статуса устройства из базы данных в Kafka статус
   */
  private mapDeviceStatusToKafkaStatus(dbStatus: string): string {
    switch (dbStatus) {
      case 'bound':
      case 'unbound':
        return 'offline'; // По умолчанию считаем offline
      default:
        return 'offline';
    }
  }
}
