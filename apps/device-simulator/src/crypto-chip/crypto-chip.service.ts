import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { promisify } from 'util';

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

    // Создаем subject для сертификата
    const subject = [
      ['CN', deviceId], // Common Name - ID устройства
      ['O', organizationName], // Organization
      ['C', countryCode], // Country
    ];

    // Используем Node.js crypto для создания CSR
    const csr = crypto.createSign('RSA-SHA256');

    // Создаем простой CSR в формате, который понимает OpenSSL
    const csrContent = this.createCSRContent(deviceId, subject);

    const signature = csr
      .update(csrContent)
      .sign(this.keyPair.privateKey, 'base64');

    // Формируем PEM формат CSR
    const csrPem = this.formatCSRToPEM(csrContent, signature);

    const csrData: CsrData = {
      csr: csrPem,
      publicKey: this.keyPair.publicKey,
      deviceId,
    };

    this.logger.log('CSR успешно создан');
    return csrData;
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

  /**
   * Создание содержимого CSR
   */
  private createCSRContent(deviceId: string, subject: string[][]): string {
    // Упрощенная версия CSR содержимого
    const subjectString = subject
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');

    return `-----BEGIN CERTIFICATE REQUEST-----
Subject: ${subjectString}
Device-ID: ${deviceId}
Public-Key: ${this.keyPair?.publicKey.replace(/\n/g, '\\n') || ''}
-----END CERTIFICATE REQUEST-----`;
  }

  /**
   * Форматирование CSR в PEM формат
   */
  private formatCSRToPEM(content: string, signature: string): string {
    const base64Content = Buffer.from(content).toString('base64');
    const base64Signature = signature;

    // Простая имитация PEM формата CSR
    return `-----BEGIN CERTIFICATE REQUEST-----
${base64Content}
-----SIGNATURE-----
${base64Signature}
-----END CERTIFICATE REQUEST-----`;
  }
}
