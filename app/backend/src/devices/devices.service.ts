import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { type CreateDeviceDto } from 'iot-core';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(Certificate) private certRepo: Repository<Certificate>,
    private crypto: CryptoService
  ) {}

  async createDevice(dto: CreateDeviceDto) {
    // Получаем сертификаты от CryptoService
    const { clientCert, caCert, fingerprint, publicKeyPem } =
      this.crypto.signCertificate({
        deviceId: dto.deviceId,
        csrPem: dto.csrPem,
      });

    // Создаем устройство
    const device = this.deviceRepo.create({
      // Используем deviceId как уникальный идентификатор
      model: dto.model || '',
      publicKey: publicKeyPem,
      fingerprint,
      deviceId: dto.deviceId,
      ownerId: null,
      status: 'unbound',
      lastSeenAt: new Date(),
      firmwareVersion: dto.firmwareVersion || null,
    });

    // Сохраняем устройство
    const savedDevice = await this.deviceRepo.save(device);

    // Создаем и сохраняем сертификат
    const certificate = this.certRepo.create({
      clientCert,
      caCert,
      fingerprint,
      deviceId: dto.deviceId,
    });

    await this.certRepo.save(certificate);

    return {
      device: savedDevice,
      certificate: {
        clientCert,
        caCert,
        fingerprint,
      },
    };
  }

  /**
   * Привязывает устройство к владельцу.
   * @param deviceId - Идентификатор устройства.
   * @param ownerId - Идентификатор владельца.
   * @returns Обновленное устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено или уже привязано к другому владельцу.
   */

  async bindDevice(deviceId: string, ownerId: string) {
    // Находим устройство по deviceId
    const device = await this.deviceRepo.findOne({
      where: { deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    // Проверяем, что устройство не привязано к другому владельцу
    if (device.ownerId) {
      throw new Error(
        `Device with ID ${deviceId} is already bound to another owner`
      );
    }
    // Обновляем владельца устройства
    device.ownerId = ownerId;
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
   * @returns Обновленное устройство с сертификатом.
   * @throws Ошибка, если устройство не найдено или уже отвязано.
   */

  async unbindDevice(deviceId: string) {
    // Находим устройство по deviceId
    const device = await this.deviceRepo.findOne({
      where: { deviceId },
      relations: ['certificate'],
    });
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    // Проверяем, что устройство привязано к владельцу
    if (!device.ownerId) {
      throw new Error(`Device with ID ${deviceId} is already unbound`);
    }
    // Отвязываем устройство от владельца
    device.ownerId = undefined;
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
   * @returns Список устройств с сертификатами.
   *
   */

  async getDevices({ page = 1, limit = 10 } = {}) {
    return this.deviceRepo.find({
      relations: ['certificate'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
