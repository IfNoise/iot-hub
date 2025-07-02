import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service.js';
import { CertificateResponseSchema } from '@iot-hub/devices';
import { z } from 'zod';

// Типы из contracts
type BackendCertificateResponse = z.infer<typeof CertificateResponseSchema>;

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

  constructor(
    private readonly cryptoChipService: CryptoChipService,
    private readonly httpService: HttpService
  ) {}

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
      // Проверяем, что ключевая пара уже сгенерирована
      const chipInfo = this.cryptoChipService.getChipInfo();
      if (!chipInfo.hasKeyPair) {
        throw new Error(
          'Криптографический чип не инициализирован. Вызовите initializeChip() сначала.'
        );
      }

      // Создаем CSR с существующей ключевой парой
      this.logger.log('Создание CSR...');
      const csrData = await this.cryptoChipService.generateCSR(deviceId);

      // Отправляем CSR на backend для подписания
      this.logger.log('Отправка CSR на backend для подписания...');
      const signedCertificate = await this.signCSRWithBackend(
        deviceId,
        csrData.csr, // Передаем строку CSR, а не весь объект
        backendUrl,
        {
          firmwareVersion,
          hardwareVersion,
        }
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
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false, // Для тестовой среды игнорируем самоподписанные сертификаты
          }),
        })
      );

      const result = response.data as BackendCertificateResponse;

      // Преобразуем ответ backend в ожидаемый формат
      const deviceCertificateResponse: DeviceCertificateResponse = {
        deviceId,
        clientCert: result.certificate,
        caCert: result.caCertificate,
        fingerprint: result.fingerprint,
        // Для mTLS возвращаем правильный хост без порта
        brokerUrl: backendUrl.replace('/api/', '').replace(':3000', ''),
        mqttPort: 1883,
        mqttSecurePort: 8883,
        serialNumber: '', // Не входит в базовую схему ответа
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      return deviceCertificateResponse;
    } catch (error) {
      this.logger.error('Ошибка при отправке CSR на backend:', error);

      // Обрабатываем HTTP ошибки
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as {
          response?: { status?: number; data?: unknown };
        };
        const status = httpError.response?.status;
        const data = httpError.response?.data;
        throw new Error(
          `Backend вернул ошибку ${status}: ${JSON.stringify(data)}`
        );
      }

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

      const certificateInfo = (await response.json()) as { validTo: string };

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
      const url = `${backendUrl}/api/devices/certificates/ca-certificate`;

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

      const result = (await response.json()) as { caCert: string };

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
