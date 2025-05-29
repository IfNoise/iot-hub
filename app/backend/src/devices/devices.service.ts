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
      model: '',
      publicKey: publicKeyPem,
      fingerprint,
      deviceId: dto.deviceId,
      ownerId: null,
      status: 'unbound',
      lastSeenAt: new Date(),
      firmwareVersion: null,
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

  async getDevices() {
    return this.deviceRepo.find({
      relations: ['certificate'],
      order: { createdAt: 'DESC' },
    });
  }
}
