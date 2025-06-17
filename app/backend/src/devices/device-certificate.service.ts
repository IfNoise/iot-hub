import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { Device } from '../entities/device.entity';
import { CryptoService } from '../../crypto/crypto.service';
import { ConfigService } from '../../config/config.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

export interface DeviceCertificateRequest {
  deviceId: string;
  publicKey: string;
  commonName?: string;
  organizationUnit?: string;
  organization?: string;
  locality?: string;
  state?: string;
  country?: string;
}

export interface DeviceCertificateBundle {
  clientCert: string; // PEM encoded client certificate
  clientKey?: string; // PEM encoded private key (only for new certificates)
  caCert: string; // PEM encoded CA certificate
  fingerprint: string; // Certificate fingerprint
  validUntil: Date;
}

/**
 * Сервис для управления mTLS сертификатами устройств
 *
 * Этот сервис отвечает за:
 * - Генерацию корневого CA сертификата
 * - Создание клиентских сертификатов для устройств
 * - Валидацию сертификатов
 * - Отзыв сертификатов
 */
@Injectable()
export class DeviceCertificateService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(DeviceCertificateService.name)
    private readonly logger: PinoLogger
  ) {}

  /**
   * Создает сертификат для устройства
   */
  async createDeviceCertificate(
    request: DeviceCertificateRequest
  ): Promise<DeviceCertificateBundle> {
    const { deviceId, commonName = `device-${deviceId}` } = request;

    this.logger.info(
      { deviceId, commonName },
      'Создание сертификата для устройства'
    );

    try {
      // Проверяем, существует ли устройство
      const device = await this.deviceRepository.findOne({
        where: { id: deviceId },
        relations: ['certificate'],
      });

      if (!device) {
        throw new Error(`Устройство с ID ${deviceId} не найдено`);
      }

      if (device.certificate) {
        throw new Error(
          `Устройство ${deviceId} уже имеет сертификат. Используйте renewDeviceCertificate для обновления.`
        );
      }

      // Получаем или создаем CA сертификат
      const caCert = await this.getOrCreateCACertificate();

      // Создаем ключевую пару для устройства
      const { publicKey: devicePublicKey, privateKey: devicePrivateKey } =
        this.generateKeyPair();

      // Создаем CSR (Certificate Signing Request)
      const csr = this.createCertificateSigningRequest({
        keyPair: { publicKey: devicePublicKey, privateKey: devicePrivateKey },
        commonName,
        organizationUnit: request.organizationUnit || 'IoT Devices',
        organization: request.organization || 'IoT Hub',
        locality: request.locality || 'Unknown',
        state: request.state || 'Unknown',
        country: request.country || 'RU',
      });

      // Подписываем сертификат CA
      const clientCert = await this.signCertificate(csr, caCert);

      // Вычисляем отпечаток сертификата
      const fingerprint = this.calculateFingerprint(clientCert);

      // Сохраняем сертификат в базе данных
      const certificate = this.certificateRepository.create({
        clientCert: forge.pki.certificateToPem(clientCert),
        caCert: caCert.caCertPem,
        fingerprint,
        device,
      });

      await this.certificateRepository.save(certificate);

      this.logger.info(
        { deviceId, fingerprint },
        'Сертификат успешно создан и сохранен'
      );

      return {
        clientCert: forge.pki.certificateToPem(clientCert),
        clientKey: forge.pki.privateKeyToPem(devicePrivateKey),
        caCert: caCert.caCertPem,
        fingerprint,
        validUntil: clientCert.validity.notAfter,
      };
    } catch (error) {
      this.logger.error(
        { deviceId, error: error.message },
        'Ошибка создания сертификата устройства'
      );
      throw error;
    }
  }

  /**
   * Получает сертификат устройства
   */
  async getDeviceCertificate(
    deviceId: string
  ): Promise<DeviceCertificateBundle | null> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device || !device.certificate) {
      return null;
    }

    const cert = forge.pki.certificateFromPem(device.certificate.clientCert);

    return {
      clientCert: device.certificate.clientCert,
      caCert: device.certificate.caCert,
      fingerprint: device.certificate.fingerprint,
      validUntil: cert.validity.notAfter,
    };
  }

  /**
   * Проверяет валидность сертификата
   */
  async validateCertificate(certificatePem: string): Promise<boolean> {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      const now = new Date();

      // Проверяем срок действия
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        this.logger.warn('Сертификат устройства истек или еще не действителен');
        return false;
      }

      // Получаем CA сертификат для проверки подписи
      const caCert = await this.getOrCreateCACertificate();
      const caForgecert = forge.pki.certificateFromPem(caCert.caCertPem);

      // Проверяем подпись
      const verified = caForgecert.verify(cert);
      if (!verified) {
        this.logger.warn('Подпись сертификата устройства невалидна');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        { error: error.message },
        'Ошибка валидации сертификата'
      );
      return false;
    }
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

    // TODO: Добавить в CRL (Certificate Revocation List)
    await this.certificateRepository.remove(device.certificate);
    device.status = 'revoked';
    await this.deviceRepository.save(device);

    this.logger.info({ deviceId }, 'Сертификат устройства отозван');
  }

  /**
   * Получает или создает корневой CA сертификат
   */
  private async getOrCreateCACertificate(): Promise<{
    caCertPem: string;
    caKeyPem: string;
    caKey: forge.pki.PrivateKey;
    caCert: forge.pki.Certificate;
  }> {
    // В production это должно храниться в защищенном хранилище
    const caCertPath =
      this.configService.get('CA_CERT_PATH') || './ca-cert.pem';
    const caKeyPath = this.configService.get('CA_KEY_PATH') || './ca-key.pem';

    try {
      // Пытаемся загрузить существующий CA
      const fs = require('fs');
      if (fs.existsSync(caCertPath) && fs.existsSync(caKeyPath)) {
        const caCertPem = fs.readFileSync(caCertPath, 'utf8');
        const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
        const caCert = forge.pki.certificateFromPem(caCertPem);
        const caKey = forge.pki.privateKeyFromPem(caKeyPem);

        return { caCertPem, caKeyPem, caKey, caCert };
      }
    } catch (error) {
      this.logger.warn('Не удалось загрузить существующий CA, создаем новый', error);
    }

    // Создаем новый CA
    this.logger.info('Создание нового корневого CA сертификата');

    const { publicKey, privateKey } = this.generateKeyPair();
    const cert = forge.pki.createCertificate();

    cert.publicKey = publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 10
    );

    const attrs = [
      { name: 'commonName', value: 'IoT Hub Root CA' },
      { name: 'organizationName', value: 'IoT Hub' },
      { name: 'organizationalUnitName', value: 'Certificate Authority' },
      { name: 'countryName', value: 'RU' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    cert.setExtensions([
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    ]);

    cert.sign(privateKey, forge.md.sha256.create());

    const caCertPem = forge.pki.certificateToPem(cert);
    const caKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Сохраняем CA на диск
    try {
      const fs = require('fs');
      fs.writeFileSync(caCertPath, caCertPem);
      fs.writeFileSync(caKeyPath, caKeyPem);
      this.logger.info('CA сертификат сохранен на диск');
    } catch (error) {
      this.logger.warn('Не удалось сохранить CA на диск:', error.message);
    }

    return {
      caCertPem,
      caKeyPem,
      caKey: privateKey,
      caCert: cert,
    };
  }

  /**
   * Генерирует ключевую пару RSA
   */
  private generateKeyPair(): {
    publicKey: forge.pki.PublicKey;
    privateKey: forge.pki.PrivateKey;
  } {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    return keyPair;
  }

  /**
   * Создает Certificate Signing Request
   */
  private createCertificateSigningRequest(params: {
    keyPair: {
      publicKey: forge.pki.PublicKey;
      privateKey: forge.pki.PrivateKey;
    };
    commonName: string;
    organizationUnit: string;
    organization: string;
    locality: string;
    state: string;
    country: string;
  }): forge.pki.CertificateRequest {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = params.keyPair.publicKey;

    const attrs = [
      { name: 'commonName', value: params.commonName },
      { name: 'organizationName', value: params.organization },
      { name: 'organizationalUnitName', value: params.organizationUnit },
      { name: 'localityName', value: params.locality },
      { name: 'stateOrProvinceName', value: params.state },
      { name: 'countryName', value: params.country },
    ];

    csr.setSubject(attrs);
    csr.sign(params.keyPair.privateKey, forge.md.sha256.create());

    return csr;
  }

  /**
   * Подписывает CSR с помощью CA
   */
  private async signCertificate(
    csr: forge.pki.CertificateRequest,
    ca: { caCert: forge.pki.Certificate; caKey: forge.pki.PrivateKey }
  ): Promise<forge.pki.Certificate> {
    const cert = forge.pki.createCertificate();

    cert.publicKey = csr.publicKey;
    cert.serialNumber = this.generateSerialNumber();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 1
    );

    cert.setSubject(csr.subject.attributes);
    cert.setIssuer(ca.caCert.subject.attributes);

    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', clientAuth: true },
    ]);

    cert.sign(ca.caKey, forge.md.sha256.create());

    return cert;
  }

  /**
   * Генерирует серийный номер для сертификата
   */
  private generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Вычисляет отпечаток сертификата (SHA-256)
   */
  private calculateFingerprint(cert: forge.pki.Certificate): string {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha256.create();
    md.update(der);
    return md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';
  }
}
