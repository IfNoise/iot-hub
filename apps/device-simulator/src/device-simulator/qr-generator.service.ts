import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  DeviceQRDataSchema,
  MinimalDeviceQRSchema,
  TokenBasedDeviceQRSchema,
  HashBasedDeviceQRSchema,
} from '@iot-hub/devices';
import { z } from 'zod';

export type QRCodeType = 'minimal' | 'token' | 'hash';

export interface QRCodeGenerationOptions {
  type: QRCodeType;
  deviceId: string;
  fingerprint?: string;
  bindingToken?: string;
  keyHash?: string;
}

export interface QRCodeResult {
  data: z.infer<typeof DeviceQRDataSchema>;
  jsonString: string;
  estimatedSize: number;
  asciiQR: string;
  type: QRCodeType;
}

/**
 * Сервис для генерации QR-кодов устройств
 * Поддерживает все три типа QR-кодов согласно документации
 */
@Injectable()
export class QRGeneratorService {
  private readonly logger = new Logger(QRGeneratorService.name);

  /**
   * Генерирует QR-код для устройства
   */
  async generateDeviceQR(
    options: QRCodeGenerationOptions
  ): Promise<QRCodeResult> {
    this.logger.log(
      `Генерация QR-кода типа "${options.type}" для устройства ${options.deviceId}`
    );

    // Создаем данные QR-кода в зависимости от типа
    const qrData = this.createQRData(options);

    // Валидируем данные
    this.validateQRData(qrData, options.type);

    const jsonString = JSON.stringify(qrData);
    const estimatedSize = jsonString.length;

    this.logger.debug(`Размер QR-кода: ${estimatedSize} символов`);
    this.logger.debug(`Данные QR-кода: ${jsonString}`);

    // Генерируем ASCII представление QR-кода для вывода в консоль
    const asciiQR = await this.generateASCIIQR(jsonString);

    return {
      data: qrData,
      jsonString,
      estimatedSize,
      asciiQR,
      type: options.type,
    };
  }

  /**
   * Генерирует случайный токен привязки
   */
  generateBindingToken(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Генерирует хеш публичного ключа (имитация)
   */
  generateKeyHash(): string {
    const hash = Math.random().toString(36).substring(2, 18);
    return `sha256-${hash}`;
  }

  /**
   * Выводит QR-код в консоль
   */
  printQRToConsole(result: QRCodeResult): void {
    const border = '═'.repeat(60);

    console.log('\n' + border);
    console.log(`║  QR-КОД УСТРОЙСТВА (${result.type.toUpperCase()})  `);
    console.log(border);
    console.log(`║  Устройство: ${result.data.deviceId}`);
    console.log(`║  Размер: ${result.estimatedSize} символов`);
    console.log(`║  Тип: ${this.getQRTypeDescription(result.type)}`);
    console.log(border);
    console.log('\n📱 Сканируйте этот QR-код:');
    console.log(result.asciiQR);
    console.log('\n📋 JSON данные:');
    console.log(result.jsonString);
    console.log('\n' + border + '\n');
  }

  /**
   * Создает данные QR-кода в зависимости от типа
   */
  private createQRData(
    options: QRCodeGenerationOptions
  ): z.infer<typeof DeviceQRDataSchema> {
    switch (options.type) {
      case 'minimal':
        if (!options.fingerprint) {
          throw new Error('Fingerprint обязателен для минимального QR-кода');
        }
        return {
          deviceId: options.deviceId,
          fingerprint: options.fingerprint,
          v: 1,
        };

      case 'token':
        if (!options.bindingToken) {
          throw new Error('Токен привязки обязателен для токен-QR-кода');
        }
        return {
          deviceId: options.deviceId,
          bindingToken: options.bindingToken,
          v: 1,
        };

      case 'hash':
        if (!options.fingerprint || !options.keyHash) {
          throw new Error('Fingerprint и keyHash обязательны для хеш-QR-кода');
        }
        return {
          deviceId: options.deviceId,
          fingerprint: options.fingerprint,
          keyHash: options.keyHash,
          v: 1,
        };

      default:
        throw new Error(`Неподдерживаемый тип QR-кода: ${options.type}`);
    }
  }

  /**
   * Валидирует данные QR-кода
   */
  private validateQRData(data: unknown, type: QRCodeType): void {
    try {
      switch (type) {
        case 'minimal':
          MinimalDeviceQRSchema.parse(data);
          break;
        case 'token':
          TokenBasedDeviceQRSchema.parse(data);
          break;
        case 'hash':
          HashBasedDeviceQRSchema.parse(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Ошибка валидации QR-кода типа ${type}:`, error);
      throw new Error(`Невалидные данные QR-кода: ${error.message}`);
    }
  }

  /**
   * Генерирует ASCII представление QR-кода
   */
  private async generateASCIIQR(data: string): Promise<string> {
    try {
      // Генерируем QR-код в виде ASCII символов
      return await QRCode.toString(data, {
        type: 'terminal',
        small: true,
        margin: 1,
      });
    } catch (error) {
      this.logger.error('Ошибка генерации ASCII QR-кода:', error);
      // Возвращаем простую заглушку в случае ошибки
      return `[QR-КОД: ${data}]`;
    }
  }

  /**
   * Возвращает описание типа QR-кода
   */
  private getQRTypeDescription(type: QRCodeType): string {
    switch (type) {
      case 'minimal':
        return 'Минимальный (deviceId + fingerprint)';
      case 'token':
        return 'С токеном (deviceId + bindingToken) - Рекомендуемый';
      case 'hash':
        return 'С хешем (deviceId + fingerprint + keyHash)';
      default:
        return 'Неизвестный';
    }
  }
}
