import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { CryptoService } from '../crypto/crypto.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Certificate } from '../devices/entities/certificate.entity';
import { Device } from '../devices/entities/device.entity';
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as path from 'path';

export interface DeviceCertificateBundle {
  deviceId: string;
  clientCert: string;
  clientKey: string;
  caCert: string;
  brokerUrl: string;
  mqttPort: number;
  mqttSecurePort: number;
  fingerprint: string;
}

/**
 * Сервис для управления mTLS сертификатами устройств
 *
 * Расширяет существующий CryptoService для поддержки mTLS:
 * - Персистентное хранение CA сертификата
 * - Управление жизненным циклом сертификатов
 * - Интеграция с EMQX брокером
 * - Сохранение сертификатов в файловой системе
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly certsDir: string;
  private caCert?: forge.pki.Certificate;
  private caKey?: forge.pki.PrivateKey;

  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>
  ) {
    this.certsDir = path.join(process.cwd(), 'certs');
    this.ensureCertsDirectory();
    this.initializeCA();
  }

  /**
   * Создает директорию для сертификатов если её нет
   */
  private ensureCertsDirectory(): void {
    if (!fs.existsSync(this.certsDir)) {
      fs.mkdirSync(this.certsDir, { recursive: true });
      this.logger.log(`Создана директория для сертификатов: ${this.certsDir}`);
    }
  }

  /**
   * Инициализирует или загружает персистентный CA сертификат
   */
  private initializeCA(): void {
    const caKeyPath = path.join(this.certsDir, 'ca-key.pem');
    const caCertPath = path.join(this.certsDir, 'ca-cert.pem');

    try {
      if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
        // Загружаем существующий CA
        const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
        const caCertPem = fs.readFileSync(caCertPath, 'utf8');

        this.caKey = forge.pki.privateKeyFromPem(caKeyPem);
        this.caCert = forge.pki.certificateFromPem(caCertPem);

        this.logger.log(
          'Персистентный CA сертификат загружен из файловой системы'
        );
      } else {
        // Создаем новый персистентный CA
        this.generatePersistentCA();
        this.logger.log('Создан новый персистентный CA сертификат');
      }
    } catch (error) {
      this.logger.error('Ошибка инициализации CA:', error);
      throw new Error('Не удалось инициализировать CA сертификат');
    }
  }

  /**
   * Генерирует новый персистентный CA сертификат (сохраняется в файлы)
   */
  private generatePersistentCA(): void {
    // Генерируем ключевую пару для CA
    const keys = forge.pki.rsa.generateKeyPair(2048);

    // Создаем сертификат CA
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 10
    );

    const attrs = [
      { name: 'commonName', value: 'IoT Hub CA' },
      { name: 'countryName', value: 'RU' },
      { name: 'stateOrProvinceName', value: 'Moscow' },
      { name: 'localityName', value: 'Moscow' },
      { name: 'organizationName', value: 'IoT Hub' },
      { name: 'organizationalUnitName', value: 'Certificate Authority' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Расширения для CA
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        critical: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    // Подписываем сертификат
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Сохраняем CA
    this.caCert = cert;
    this.caKey = keys.privateKey;

    // Записываем в файлы для персистентности
    const caKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const caCertPem = forge.pki.certificateToPem(cert);

    fs.writeFileSync(path.join(this.certsDir, 'ca-key.pem'), caKeyPem);
    fs.writeFileSync(path.join(this.certsDir, 'ca-cert.pem'), caCertPem);
  }

  /**
   * Создает и сохраняет сертификат для устройства с использованием CryptoService
   */
  async createDeviceCertificate(
    deviceId: string
  ): Promise<DeviceCertificateBundle> {
    // Проверяем, существует ли устройство
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device) {
      throw new Error(`Устройство ${deviceId} не найдено`);
    }

    // Проверяем, есть ли уже сертификат
    if (device.certificate) {
      this.logger.warn(`Устройство ${deviceId} уже имеет сертификат`);
      throw new Error(`Устройство ${deviceId} уже имеет сертификат`);
    }

    // Генерируем ключевую пару для устройства
    const deviceKeys = forge.pki.rsa.generateKeyPair(2048);

    // Создаем CSR (Certificate Signing Request)
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = deviceKeys.publicKey;

    csr.setSubject([
      { name: 'commonName', value: `device-${deviceId}` },
      { name: 'countryName', value: 'RU' },
      { name: 'organizationName', value: 'IoT Hub' },
      { name: 'organizationalUnitName', value: 'Devices' },
    ]);

    // Подписываем CSR приватным ключом устройства
    csr.sign(deviceKeys.privateKey, forge.md.sha256.create());

    // Преобразуем CSR в PEM формат
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // Используем существующий CryptoService для подписания
    // НО модифицируем его для использования нашего персистентного CA
    const signResult = this.signCertificateWithPersistentCA(deviceId, csrPem);

    const deviceKey = forge.pki.privateKeyToPem(deviceKeys.privateKey);

    // Сохраняем в базу данных
    const certificate = this.certificateRepository.create({
      clientCert: signResult.clientCert,
      caCert: signResult.caCert,
      fingerprint: signResult.fingerprint,
      device: device,
    });

    await this.certificateRepository.save(certificate);

    // Сохраняем файлы для использования в EMQX
    const deviceCertPath = path.join(
      this.certsDir,
      `device-${deviceId}-cert.pem`
    );
    const deviceKeyPath = path.join(
      this.certsDir,
      `device-${deviceId}-key.pem`
    );

    fs.writeFileSync(deviceCertPath, signResult.clientCert);
    fs.writeFileSync(deviceKeyPath, deviceKey);

    this.logger.log(`Сертификат для устройства ${deviceId} создан и сохранен`);

    return {
      deviceId,
      clientCert: signResult.clientCert,
      clientKey: deviceKey,
      caCert: signResult.caCert,
      brokerUrl: this.configService.getMqttBrokerHost(),
      mqttPort: this.configService.getMqttBrokerPort(),
      mqttSecurePort: this.configService.getMqttSecureBrokerPort(),
      fingerprint: signResult.fingerprint,
    };
  }

  /**
   * Модифицированная версия CryptoService.signCertificate для использования персистентного CA
   */
  private signCertificateWithPersistentCA(deviceId: string, csrPem: string) {
    if (!this.caCert || !this.caKey) {
      throw new Error('CA не инициализирован');
    }

    const pki = forge.pki;
    const csr = pki.certificationRequestFromPem(csrPem);

    if (!csr.verify()) {
      throw new Error('CSR verification failed');
    }

    if (!csr.publicKey) {
      throw new Error('CSR does not contain a valid public key');
    }

    const cert = pki.createCertificate();
    cert.publicKey = csr.publicKey;
    cert.serialNumber = Math.floor(Math.random() * 1000000).toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 1
    );

    cert.setSubject([{ name: 'commonName', value: `device-${deviceId}` }]);

    // Используем наш персистентный CA вместо генерации нового
    cert.setIssuer(this.caCert.subject.attributes);
    cert.sign(this.caKey, forge.md.sha256.create());

    const clientCertPem = pki.certificateToPem(cert);
    const caCertPem = pki.certificateToPem(this.caCert);

    const fingerprint =
      forge.md.sha256
        .create()
        .update(forge.asn1.toDer(pki.certificateToAsn1(cert)).getBytes())
        .digest()
        .toHex()
        .match(/.{2}/g)
        ?.join(':')
        .toUpperCase() || '';

    return {
      clientCert: clientCertPem,
      caCert: caCertPem,
      fingerprint,
    };
  }

  /**
   * Получает сертификат устройства из базы данных
   */
  async getDeviceCertificate(deviceId: string): Promise<Certificate | null> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    return device?.certificate || null;
  }

  /**
   * Отзывает сертификат устройства
   */
  async revokeCertificate(deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device || !device.certificate) {
      throw new Error(`Сертификат для устройства ${deviceId} не найден`);
    }

    // Удаляем из базы данных
    await this.certificateRepository.remove(device.certificate);

    // Удаляем файлы
    const deviceCertPath = path.join(
      this.certsDir,
      `device-${deviceId}-cert.pem`
    );
    const deviceKeyPath = path.join(
      this.certsDir,
      `device-${deviceId}-key.pem`
    );

    if (fs.existsSync(deviceCertPath)) {
      fs.unlinkSync(deviceCertPath);
    }
    if (fs.existsSync(deviceKeyPath)) {
      fs.unlinkSync(deviceKeyPath);
    }

    // Обновляем статус устройства
    device.status = 'revoked';
    await this.deviceRepository.save(device);

    this.logger.log(`Сертификат для устройства ${deviceId} отозван`);
  }

  /**
   * Валидирует сертификат устройства
   */
  async validateCertificate(fingerprint: string): Promise<boolean> {
    const certificate = await this.certificateRepository.findOne({
      where: { fingerprint },
      relations: ['device'],
    });

    if (!certificate) {
      return false;
    }

    // Проверяем статус устройства
    if (certificate.device.status === 'revoked') {
      return false;
    }

    // Проверяем срок действия сертификата
    try {
      const cert = forge.pki.certificateFromPem(certificate.clientCert);
      const now = new Date();

      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Ошибка валидации сертификата:', error);
      return false;
    }
  }

  /**
   * Получает персистентный CA сертификат для конфигурации EMQX
   */
  getCACertificate(): string {
    if (!this.caCert) {
      throw new Error('CA сертификат не инициализирован');
    }
    return forge.pki.certificateToPem(this.caCert);
  }
}
