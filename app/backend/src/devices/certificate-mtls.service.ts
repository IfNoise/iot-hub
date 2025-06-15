import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { CryptoService } from '../crypto/crypto.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { Device } from './entities/device.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';

export interface DeviceCertificateRequest {
  deviceId: string;
  csrPem: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

export interface DeviceCertificateResponse {
  deviceId: string;
  clientCert: string;
  caCert: string;
  brokerUrl: string;
  mqttPort: number;
  mqttSecurePort: number;
  fingerprint: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  deviceId?: string;
  reason?: string;
  fingerprint: string;
}

/**
 * Сервис для управления mTLS сертификатами устройств с криптографическими чипами
 * 
 * Реализует правильный PKI флоу:
 * 1. Устройство генерирует ключевую пару на криптографическом чипе
 * 2. Устройство создает CSR (Certificate Signing Request) 
 * 3. Backend подписывает CSR с помощью CA
 * 4. Устройство получает подписанный сертификат
 * 5. Устройство использует сертификат для mTLS подключения к EMQX
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly certsDir: string;
  private persistentCACert?: string;
  private persistentCAKey?: string;

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
    this.initializePersistentCA();
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
   * Инициализирует или создает постоянный CA для подписи сертификатов
   */
  private initializePersistentCA(): void {
    const caKeyPath = path.join(this.certsDir, 'ca-key.pem');
    const caCertPath = path.join(this.certsDir, 'ca-cert.pem');

    try {
      if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
        // Загружаем существующий CA
        this.persistentCAKey = fs.readFileSync(caKeyPath, 'utf8');
        this.persistentCACert = fs.readFileSync(caCertPath, 'utf8');
        this.logger.log('Постоянный CA сертификат загружен из файловой системы');
      } else {
        // Создаем новый постоянный CA
        this.generatePersistentCA();
        this.logger.log('Создан новый постоянный CA сертификат');
      }
    } catch (error) {
      this.logger.error('Ошибка инициализации постоянного CA:', error);
      throw new Error('Не удалось инициализировать постоянный CA сертификат');
    }
  }

  /**
   * Генерирует постоянный CA сертификат для подписи клиентских сертификатов
   */
  private generatePersistentCA(): void {
    const pki = forge.pki;
    
    // Генерируем ключевую пару для CA
    const caKeyPair = pki.rsa.generateKeyPair(2048);
    
    // Создаем CA сертификат
    const caCert = pki.createCertificate();
    caCert.publicKey = caKeyPair.publicKey;
    caCert.serialNumber = '01';
    caCert.validity.notBefore = new Date();
    caCert.validity.notAfter = new Date();
    caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);

    const attrs = [
      { name: 'commonName', value: 'IoT Hub Root CA' },
      { name: 'countryName', value: 'RU' },
      { name: 'stateOrProvinceName', value: 'Moscow' },
      { name: 'localityName', value: 'Moscow' },
      { name: 'organizationName', value: 'IoT Hub' },
      { name: 'organizationalUnitName', value: 'Certificate Authority' }
    ];

    caCert.setSubject(attrs);
    caCert.setIssuer(attrs);

    // Расширения для CA
    caCert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        critical: true
      },
      {
        name: 'subjectKeyIdentifier'
      }
    ]);

    // Подписываем сертификат
    caCert.sign(caKeyPair.privateKey, forge.md.sha256.create());

    // Сохраняем в память и файлы
    this.persistentCAKey = pki.privateKeyToPem(caKeyPair.privateKey);
    this.persistentCACert = pki.certificateToPem(caCert);

    // Записываем в файлы
    fs.writeFileSync(path.join(this.certsDir, 'ca-key.pem'), this.persistentCAKey);
    fs.writeFileSync(path.join(this.certsDir, 'ca-cert.pem'), this.persistentCACert);
    
    // Устанавливаем правильные права доступа
    fs.chmodSync(path.join(this.certsDir, 'ca-key.pem'), 0o600);
    fs.chmodSync(path.join(this.certsDir, 'ca-cert.pem'), 0o644);
  }

  /**
   * Подписывает CSR от устройства с помощью постоянного CA
   */
  async signDeviceCSR(request: DeviceCertificateRequest): Promise<DeviceCertificateResponse> {
    const { deviceId, csrPem, firmwareVersion } = request;

    this.logger.log(`Получен запрос на подписание CSR для устройства: ${deviceId}`);

    // Проверяем, существует ли устройство
    const device = await this.deviceRepository.findOne({ 
      where: { id: deviceId },
      relations: ['certificate']
    });

    if (!device) {
      throw new Error(`Устройство ${deviceId} не найдено в системе`);
    }

    // Проверяем, есть ли уже сертификат
    if (device.certificate) {
      // Можно разрешить обновление сертификата или запретить
      this.logger.warn(`Устройство ${deviceId} уже имеет сертификат. Обновляем...`);
      await this.certificateRepository.remove(device.certificate);
    }

    try {
      // Валидируем и подписываем CSR с помощью постоянного CA
      const signedResult = this.signCSRWithPersistentCA(deviceId, csrPem);

      // Извлекаем информацию о сертификате
      const cert = forge.pki.certificateFromPem(signedResult.clientCert);
      
      // Сохраняем сертификат в базу данных
      const certificate = this.certificateRepository.create({
        clientCert: signedResult.clientCert,
        caCert: signedResult.caCert,
        fingerprint: signedResult.fingerprint,
        deviceId: device.id
      });

      const savedCertificate = await this.certificateRepository.save(certificate);

      // Обновляем информацию об устройстве
      if (firmwareVersion) {
        device.firmwareVersion = firmwareVersion;
      }
      device.lastSeenAt = new Date();
      device.certificate = savedCertificate;
      await this.deviceRepository.save(device);

      this.logger.log(`Сертификат для устройства ${deviceId} подписан и сохранен в базе данных`);

      return {
        deviceId,
        clientCert: signedResult.clientCert,
        caCert: signedResult.caCert,
        brokerUrl: this.configService.getMqttBrokerHost(),
        mqttPort: this.configService.getMqttBrokerPort(),
        mqttSecurePort: this.configService.getMqttSecureBrokerPort(),
        fingerprint: signedResult.fingerprint,
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore.toISOString(),
        validTo: cert.validity.notAfter.toISOString()
      };
    } catch (error: any) {
      this.logger.error(`Ошибка подписания CSR для устройства ${deviceId}:`, error);
      throw new Error(`Не удалось подписать CSR: ${error.message}`);
    }
  }

  /**
   * Подписывает CSR с помощью постоянного CA
   */
  private signCSRWithPersistentCA(deviceId: string, csrPem: string) {
    if (!this.persistentCACert || !this.persistentCAKey) {
      throw new Error('Постоянный CA не инициализирован');
    }

    const pki = forge.pki;

    // Парсим CSR
    const csr = pki.certificationRequestFromPem(csrPem);
    if (!csr.verify()) {
      throw new Error('CSR verification failed');
    }

    if (!csr.publicKey) {
      throw new Error('CSR does not contain a valid public key');
    }

    // Парсим CA сертификат и ключ
    const caCert = pki.certificateFromPem(this.persistentCACert);
    const caKey = pki.privateKeyFromPem(this.persistentCAKey);

    // Создаем клиентский сертификат
    const cert = pki.createCertificate();
    cert.publicKey = csr.publicKey;
    cert.serialNumber = this.generateSerialNumber();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    // Устанавливаем subject из CSR, но переопределяем CN
    const subject = csr.subject.attributes.slice();
    // Находим и обновляем CN
    const cnIndex = subject.findIndex(attr => attr.name === 'commonName');
    if (cnIndex >= 0) {
      subject[cnIndex].value = `device-${deviceId}`;
    } else {
      subject.push({ name: 'commonName', value: `device-${deviceId}` });
    }

    cert.setSubject(subject);
    cert.setIssuer(caCert.subject.attributes);

    // Расширения для клиентского сертификата
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
        critical: true
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
        critical: true
      },
      {
        name: 'extKeyUsage',
        clientAuth: true,
        critical: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          {
            type: 2, // DNS
            value: `device-${deviceId}.iot-hub.local`
          },
          {
            type: 2, // DNS
            value: deviceId
          }
        ]
      },
      {
        name: 'subjectKeyIdentifier'
      },
      {
        name: 'authorityKeyIdentifier',
        keyIdentifier: caCert.generateSubjectKeyIdentifier().getBytes()
      }
    ]);

    // Подписываем сертификат CA ключом
    cert.sign(caKey, forge.md.sha256.create());

    // Преобразуем в PEM формат
    const clientCert = pki.certificateToPem(cert);
    const caCertPem = this.persistentCACert;

    // Вычисляем отпечаток
    const fingerprint = this.calculateFingerprint(cert);

    return {
      clientCert,
      caCert: caCertPem,
      fingerprint
    };
  }

  /**
   * Получает сертификат устройства из базы данных
   */
  async getDeviceCertificate(deviceId: string): Promise<any | null> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate']
    });

    return device?.certificate || null;
  }

  /**
   * Отзывает сертификат устройства
   */
  async revokeCertificate(deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate']
    });

    if (!device || !device.certificate) {
      throw new Error(`Сертификат для устройства ${deviceId} не найден`);
    }

    // Удаляем из базы данных
    await this.certificateRepository.remove(device.certificate);

    // Обновляем статус устройства
    device.status = 'revoked';
    device.certificate = undefined;
    await this.deviceRepository.save(device);

    this.logger.log(`Сертификат для устройства ${deviceId} отозван`);
  }

  /**
   * Валидирует сертификат устройства по отпечатку
   */
  async validateCertificate(fingerprint: string): Promise<CertificateValidationResult> {
    try {
      const certificate = await this.certificateRepository.findOne({
        where: { fingerprint },
        relations: ['device']
      });

      if (!certificate) {
        return {
          valid: false,
          reason: 'Certificate not found',
          fingerprint
        };
      }

      // Проверяем статус устройства
      if (certificate.device.status === 'revoked') {
        return {
          valid: false,
          reason: 'Certificate revoked',
          deviceId: certificate.device.id,
          fingerprint
        };
      }

      // Проверяем срок действия сертификата
      const cert = forge.pki.certificateFromPem(certificate.clientCert);
      const now = new Date();
      
      if (now < cert.validity.notBefore) {
        return {
          valid: false,
          reason: 'Certificate not yet valid',
          deviceId: certificate.device.id,
          fingerprint
        };
      }

      if (now > cert.validity.notAfter) {
        return {
          valid: false,
          reason: 'Certificate expired',
          deviceId: certificate.device.id,
          fingerprint
        };
      }

      return {
        valid: true,
        deviceId: certificate.device.id,
        fingerprint
      };
    } catch (error) {
      this.logger.error('Ошибка валидации сертификата:', error);
      return {
        valid: false,
        reason: 'Validation error',
        fingerprint
      };
    }
  }

  /**
   * Получает CA сертификат для конфигурации EMQX
   */
  getCACertificate(): string {
    if (!this.persistentCACert) {
      throw new Error('CA сертификат не инициализирован');
    }
    return this.persistentCACert;
  }

  /**
   * Генерирует серийный номер для сертификата
   */
  private generateSerialNumber(): string {
    return Math.floor(Math.random() * 1000000).toString(16);
  }

  /**
   * Вычисляет SHA-256 отпечаток сертификата
   */
  private calculateFingerprint(cert: forge.pki.Certificate): string {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha256.create();
    md.update(der);
    return md.digest().toHex().match(/.{2}/g)?.join(':').toUpperCase() || '';
  }
}
