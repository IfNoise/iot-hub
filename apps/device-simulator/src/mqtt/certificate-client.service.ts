import { Injectable, Logger } from '@nestjs/common';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service';

export interface DeviceCertificateRequest {
  deviceId: string;
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

/**
 * Сервис для получения сертификатов от backend через CSR процесс
 */
@Injectable()
export class CertificateClientService {
  private readonly logger = new Logger(CertificateClientService.name);

  constructor(private readonly cryptoChipService: CryptoChipService) {}

  /**
   * Получает сертификат для устройства через CSR процесс
   */
  async obtainCertificate(
    request: DeviceCertificateRequest,
    backendUrl = 'http://localhost:3000'
  ): Promise<DeviceCertificateResponse> {
    const { deviceId, firmwareVersion, hardwareVersion } = request;

    this.logger.log(
      `Начинаем процесс получения сертификата для устройства: ${deviceId}`
    );

    try {
      // 1. Генерируем ключевую пару на криптографическом чипе
      this.logger.log('Генерация ключевой пары на криптографическом чипе...');
      const keyPair = await this.cryptoChipService.generateKeyPair();

      // 2. Создаем CSR
      this.logger.log('Создание CSR...');
      const csr = await this.cryptoChipService.createCSR(deviceId, keyPair);

      // 3. Отправляем CSR на backend для подписания
      this.logger.log('Отправка CSR на backend для подписания...');
      const signedCertificate = await this.signCSRWithBackend(
        deviceId,
        csr,
        backendUrl,
        {
          firmwareVersion,
          hardwareVersion,
        }
      );

      // 4. Сохраняем приватный ключ в чипе (он уже там, но можем обновить метаданные)
      await this.cryptoChipService.storePrivateKey(
        deviceId,
        keyPair.privateKey
      );

      this.logger.log(`Сертификат успешно получен для устройства: ${deviceId}`);

      return signedCertificate;
    } catch (error) {
      this.logger.error(
        `Ошибка получения сертификата для устройства ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Отправляет CSR на backend для подписания
   */
  private async signCSRWithBackend(
    deviceId: string,
    csrPem: string,
    backendUrl: string,
    metadata?: {
      firmwareVersion?: string;
      hardwareVersion?: string;
    }
  ): Promise<DeviceCertificateResponse> {
    const url = `${backendUrl}/api/devices/certificates/${deviceId}/sign-csr`;

    const requestBody = {
      csrPem,
      firmwareVersion: metadata?.firmwareVersion,
      hardwareVersion: metadata?.hardwareVersion,
    };

    this.logger.log(`Отправка запроса на: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Backend вернул ошибку ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();

      this.logger.log('CSR успешно подписан backend-ом');

      return result as DeviceCertificateResponse;
    } catch (error) {
      this.logger.error('Ошибка при отправке CSR на backend:', error);
      throw new Error(
        `Не удалось подписать CSR: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Проверяет валидность существующего сертификата
   */
  async validateCertificate(
    deviceId: string,
    backendUrl = 'http://localhost:3000'
  ): Promise<boolean> {
    try {
      const url = `${backendUrl}/api/devices/certificates/${deviceId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        this.logger.log(`Сертификат для устройства ${deviceId} не найден`);
        return false;
      }

      if (!response.ok) {
        this.logger.warn(`Ошибка проверки сертификата: ${response.status}`);
        return false;
      }

      const certificateInfo = await response.json();

      // Проверяем срок действия
      const validTo = new Date(certificateInfo.validTo);
      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        this.logger.warn(`Сертификат для устройства ${deviceId} истек`);
        return false;
      }

      if (daysUntilExpiry <= 30) {
        this.logger.warn(
          `Сертификат для устройства ${deviceId} истекает через ${daysUntilExpiry} дней`
        );
      }

      this.logger.log(
        `Сертификат для устройства ${deviceId} действителен еще ${daysUntilExpiry} дней`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка проверки сертификата для устройства ${deviceId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Получает информацию о CA сертификате от backend
   */
  async getCACertificate(
    backendUrl = 'http://localhost:3000'
  ): Promise<string> {
    try {
      const url = `${backendUrl}/api/devices/certificates/ca`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Backend вернул ошибку ${response.status}: ${await response.text()}`
        );
      }

      const result = await response.json();

      this.logger.log('CA сертификат успешно получен от backend');

      return result.caCert;
    } catch (error) {
      this.logger.error('Ошибка получения CA сертификата:', error);
      throw new Error(
        `Не удалось получить CA сертификат: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
