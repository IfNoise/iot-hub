import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { promisify } from 'util';
import * as forge from 'node-forge';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyType: string;
  keySize: number;
}

export interface CsrData {
  csr: string;
  publicKey: string;
  deviceId: string;
}

/**
 * Сервис имитации криптографического чипа устройства
 * Симулирует генерацию ключей, создание CSR и подпись данных
 */
@Injectable()
export class CryptoChipService {
  private readonly logger = new Logger(CryptoChipService.name);
  private keyPair: KeyPair | null = null;
  private deviceId: string | null = null;

  /**
   * Инициализация чипа с уникальным ID устройства
   */
  async initializeChip(deviceId: string): Promise<void> {
    this.logger.log(
      `Инициализация криптографического чипа для устройства: ${deviceId}`
    );
    this.deviceId = deviceId;

    // Генерируем ключевую пару при инициализации
    await this.generateKeyPair();
  }

  /**
   * Генерация RSA ключевой пары
   */
  async generateKeyPair(keySize = 2048): Promise<KeyPair> {
    this.logger.log(`Генерация RSA ключевой пары размером ${keySize} бит`);

    const generateKeyPair = promisify(crypto.generateKeyPair);

    const { publicKey, privateKey } = await generateKeyPair('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.keyPair = {
      publicKey,
      privateKey,
      keyType: 'RSA',
      keySize,
    };

    this.logger.log('Ключевая пара успешно сгенерирована');
    return this.keyPair;
  }

  /**
   * Получение публичного ключа
   */
  getPublicKey(): string {
    if (!this.keyPair) {
      throw new Error('Ключевая пара не инициализирована');
    }
    return this.keyPair.publicKey;
  }

  /**
   * Создание Certificate Signing Request (CSR)
   */
  async generateCSR(
    deviceId: string,
    organizationName = 'IoT Device',
    countryCode = 'RU'
  ): Promise<CsrData> {
    if (!this.keyPair) {
      throw new Error('Ключевая пара не инициализирована');
    }

    this.logger.log(`Создание CSR для устройства: ${deviceId}`);

    try {
      // Конвертируем PEM ключи в формат node-forge
      const privateKey = forge.pki.privateKeyFromPem(this.keyPair.privateKey);
      const publicKey = forge.pki.publicKeyFromPem(this.keyPair.publicKey);

      // Создаем CSR с помощью node-forge
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = publicKey;

      // Устанавливаем subject
      csr.setSubject([
        {
          name: 'commonName',
          value: deviceId,
        },
        {
          name: 'organizationName',
          value: organizationName,
        },
        {
          name: 'countryName',
          value: countryCode,
        },
      ]);

      // Подписываем CSR приватным ключом
      csr.sign(privateKey, forge.md.sha256.create());

      // Конвертируем в PEM формат
      const csrPem = forge.pki.certificationRequestToPem(csr);

      const csrData: CsrData = {
        csr: csrPem,
        publicKey: this.keyPair.publicKey,
        deviceId,
      };

      this.logger.log('CSR успешно создан');
      return csrData;
    } catch (error) {
      this.logger.error('Ошибка создания CSR:', error);
      throw new Error(
        `Не удалось создать CSR: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Подпись данных приватным ключом
   */
  signData(data: string): string {
    if (!this.keyPair) {
      throw new Error('Ключевая пара не инициализирована');
    }

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data, 'utf8');
    const signature = sign.sign(this.keyPair.privateKey, 'base64');

    this.logger.debug(`Данные подписаны: ${data.substring(0, 50)}...`);
    return signature;
  }

  /**
   * Проверка подписи
   */
  verifySignature(
    data: string,
    signature: string,
    publicKey?: string
  ): boolean {
    const pubKey = publicKey || this.keyPair?.publicKey;
    if (!pubKey) {
      throw new Error('Публичный ключ недоступен');
    }

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data, 'utf8');
    return verify.verify(pubKey, signature, 'base64');
  }

  /**
   * Получение информации о чипе
   */
  getChipInfo(): {
    deviceId: string | null;
    hasKeyPair: boolean;
    keyType?: string;
    keySize?: number;
  } {
    return {
      deviceId: this.deviceId,
      hasKeyPair: !!this.keyPair,
      keyType: this.keyPair?.keyType,
      keySize: this.keyPair?.keySize,
    };
  }
}
