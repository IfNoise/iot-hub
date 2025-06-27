import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CryptoChipService } from './crypto-chip.service';

export interface CertificateRequestResult {
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
 * Реализует правильный PKI флоу с криптографическим чипом
 */
@Injectable()
export class CertificateRequestService {
  private readonly logger = new Logger(CertificateRequestService.name);
  private readonly backendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cryptoChipService: CryptoChipService
  ) {
    this.backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
  }

  /**
   * Запрос сертификата для устройства через CSR процесс
   */
  async requestCertificate(
    deviceId: string,
    userId: string,
    firmwareVersion?: string,
    hardwareVersion?: string
  ): Promise<CertificateRequestResult> {
    try {
      this.logger.log(`Запрос сертификата для устройства ${deviceId}`);

      // 1. Генерируем ключевую пару на криптографическом чипе
      this.logger.log('Генерация ключевой пары на криптографическом чипе...');
      await this.cryptoChipService.generateKeyPair(deviceId);

      // 2. Создаем CSR (Certificate Signing Request)
      this.logger.log('Создание CSR...');
      const csrPem = await this.cryptoChipService.createCSR(deviceId, {
        country: 'RU',
        state: 'Moscow',
        locality: 'Moscow',
        organization: 'IoT Hub',
        organizationalUnit: 'Device',
        commonName: deviceId,
      });

      // 3. Отправляем CSR на backend для подписания
      this.logger.log('Отправка CSR на backend для подписания...');
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.backendUrl}/api/devices/certificates/${deviceId}/sign-csr`,
          {
            csrPem,
            firmwareVersion,
            hardwareVersion,
          }
        )
      );

      if (response.status !== 201) {
        throw new Error(`Ошибка подписания CSR: HTTP ${response.status}`);
      }

      const result = response.data as CertificateRequestResult;

      this.logger.log(`Сертификат успешно получен для устройства ${deviceId}`);
      this.logger.log(`  Serial: ${result.serialNumber}`);
      this.logger.log(`  Valid from: ${result.validFrom}`);
      this.logger.log(`  Valid to: ${result.validTo}`);
      this.logger.log(`  Fingerprint: ${result.fingerprint}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Ошибка запроса сертификата для устройства ${deviceId}:`,
        error
      );

      if (error.response) {
        this.logger.error(
          `HTTP Error: ${error.response.status} - ${
            error.response.data?.message || error.response.statusText
          }`
        );
      }

      throw new Error(
        `Не удалось получить сертификат для устройства ${deviceId}: ${error.message}`
      );
    }
  }

  /**
   * Проверка доступности backend API
   */
  async checkBackendAvailability(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.backendUrl}/api/health/logging`)
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Backend API недоступен: ${this.backendUrl}`);
      return false;
    }
  }

  /**
   * Получение информации о MQTT брокере от backend
   */
  async getBrokerInfo(): Promise<{
    brokerUrl: string;
    mqttPort: number;
    mqttSecurePort: number;
  }> {
    try {
      // Можно добавить отдельный endpoint для получения информации о брокере
      // Пока используем дефолтные значения
      return {
        brokerUrl: this.configService.get<string>('MQTT_HOST') || 'localhost',
        mqttPort: parseInt(
          this.configService.get<string>('MQTT_PORT') || '1883',
          10
        ),
        mqttSecurePort: parseInt(
          this.configService.get<string>('MQTT_SECURE_PORT') || '8883',
          10
        ),
      };
    } catch (error) {
      this.logger.error('Ошибка получения информации о брокере:', error);
      throw error;
    }
  }
}
