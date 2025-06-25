import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CryptoService } from '../crypto/crypto.service';
import { BindDeviceWithOwnerDto } from './dto/bind-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Certificate) private certRepo: Repository<Certificate>,
    private crypto: CryptoService
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
    // Отвязываем устройство от владельца
    device.ownerId = null;
    device.status = 'unbound';
    device.lastSeenAt = new Date();
    // Сохраняем обновленное устройство
    const updatedDevice = await this.deviceRepo.save(device);
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
   * @returns Удаленное устройство.
   * @throws Ошибка, если устройство не найдено.
   */
  async deleteDevice(deviceId: string) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    // Удаляем устройство и его сертификат (каскадно)
    await this.deviceRepo.delete({ id: deviceId });
    return device;
  }
}
