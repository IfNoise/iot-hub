import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service';
import {
  MqttDeviceService,
  MqttDeviceConfig,
  DeviceDataProvider,
} from '../mqtt/mqtt-device.service';
import { CertificateClientService } from '../mqtt/certificate-client.service';
import { MtlsConfigService } from '../mqtt/mtls-config.service';

export interface DeviceConfig {
  deviceId: string;
  model: string;
  firmwareVersion: string;
  backendUrl: string;
  autoRegister: boolean;
  // MQTT конфигурация
  mqtt?: {
    brokerUrl: string;
    userId?: string;
    token?: string;
    qos?: 0 | 1 | 2;
    // mTLS конфигурация
    useTls?: boolean;
    securePort?: number;
    autoObtainCertificates?: boolean;
    certsDir?: string;
  };
}

export interface DeviceState {
  id: string;
  status: 'uninitialized' | 'initialized' | 'registered' | 'bound' | 'error';
  lastError?: string;
  certificateFingerprint?: string;
  ownerId?: string;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp: Date;
}

/**
 * Сервис симуляции IoT устройства
 * Включает полный флоу от инициализации до привязки к пользователю
 */
@Injectable()
export class DeviceSimulatorService
  implements OnModuleInit, DeviceDataProvider
{
  private readonly logger = new Logger(DeviceSimulatorService.name);
  private deviceState: DeviceState;
  private config!: DeviceConfig;
  private sensorUpdateInterval?: NodeJS.Timeout;
  private currentSensorData: SensorData;

  constructor(
    private readonly httpService: HttpService,
    private readonly cryptoChip: CryptoChipService,
    private readonly mqttDevice: MqttDeviceService,
    private readonly certificateClient: CertificateClientService,
    private readonly mtlsConfig: MtlsConfigService
  ) {
    // Инициализация базового состояния устройства
    this.deviceState = {
      id: '',
      status: 'uninitialized',
    };

    this.currentSensorData = {
      temperature: 20.0,
      humidity: 50.0,
      pressure: 1013.25,
      timestamp: new Date(),
    };
  }

  async onModuleInit() {
    this.logger.log('Инициализация симулятора устройства...');
    // Устанавливаем себя как провайдер данных для MQTT сервиса
    this.mqttDevice.setDataProvider(this);
  }

  /**
   * Конфигурирование устройства
   */
  async configureDevice(config: DeviceConfig): Promise<void> {
    this.logger.log(`Конфигурирование устройства: ${config.deviceId}`);
    this.config = config;
    this.deviceState.id = config.deviceId;
    this.deviceState.status = 'initialized';

    // Инициализация криптографического чипа
    await this.cryptoChip.initializeChip(config.deviceId);

    // Настройка MQTT подключения
    if (config.mqtt) {
      await this.configureMqtt(config);
    }

    if (config.autoRegister) {
      await this.registerDevice();
    }

    // Запуск симуляции сенсоров
    this.startSensorSimulation();
  }

  /**
   * Настройка MQTT подключения с поддержкой mTLS
   */
  private async configureMqtt(config: DeviceConfig): Promise<void> {
    if (!config.mqtt) return;

    this.logger.log('Настройка MQTT подключения');

    const mqttConfig: MqttDeviceConfig = {
      brokerUrl: config.mqtt.brokerUrl,
      userId: config.mqtt.userId || 'simulator-user',
      deviceId: config.deviceId,
      token: config.mqtt.token,
      qos: config.mqtt.qos || 1,
      useTls: config.mqtt.useTls,
      securePort: config.mqtt.securePort,
    };

    // Если включен mTLS, получаем или генерируем сертификаты
    if (config.mqtt.useTls && config.mqtt.autoObtainCertificates) {
      this.logger.log('mTLS включен, получение сертификатов...');

      try {
        // Проверяем существующие сертификаты
        const certsDir = config.mqtt.certsDir || './certs/devices';
        const certPaths = this.mtlsConfig.getStandardCertPaths(
          config.deviceId,
          certsDir
        );
        let mtlsConfig = this.mtlsConfig.loadCertificatesFromFiles(certPaths);

        if (!mtlsConfig) {
          this.logger.log(
            'Сертификаты не найдены, получение новых через CSR...'
          );

          // Получаем новые сертификаты через CSR процесс
          const certificateResponse =
            await this.certificateClient.obtainCertificate(
              {
                deviceId: config.deviceId,
                firmwareVersion: config.firmwareVersion,
              },
              config.backendUrl
            );

          // Сохраняем полученные сертификаты в файлы
          await this.mtlsConfig.saveCertificatesToFiles(
            config.deviceId,
            {
              caCert: certificateResponse.caCert,
              clientCert: certificateResponse.clientCert,
              clientKey: '', // Ключ остается в криптографическом чипе
            },
            certsDir
          );

          // Создаем mTLS конфигурацию
          mtlsConfig = this.mtlsConfig.createMtlsConfig(
            certificateResponse.caCert,
            certificateResponse.clientCert,
            '', // Ключ будет получен из чипа
            {
              rejectUnauthorized: true,
              servername: 'localhost', // или имя сервера из brokerUrl
            }
          );

          // Обновляем URL брокера для безопасного подключения
          mqttConfig.brokerUrl = `mqtts://${certificateResponse.brokerUrl}:${certificateResponse.mqttSecurePort}`;
        }

        // Добавляем TLS конфигурацию к MQTT настройкам
        if (mtlsConfig && this.mtlsConfig.validateMtlsConfig(mtlsConfig)) {
          mqttConfig.tls = {
            ca: mtlsConfig.caCert,
            cert: mtlsConfig.clientCert,
            key: mtlsConfig.clientKey,
            rejectUnauthorized: mtlsConfig.rejectUnauthorized,
            servername: mtlsConfig.servername,
          };

          this.logger.log('mTLS конфигурация успешно настроена');
        } else {
          this.logger.error(
            'Неверная mTLS конфигурация, откат к незащищенному соединению'
          );
          mqttConfig.useTls = false;
        }
      } catch (error) {
        this.logger.error('Ошибка получения сертификатов mTLS:', error);
        this.logger.warn('Продолжение без mTLS...');
        mqttConfig.useTls = false;
      }
    }

    try {
      await this.mqttDevice.configure(mqttConfig);
      this.logger.log('MQTT успешно настроен');
    } catch (error) {
      this.logger.error('Ошибка настройки MQTT:', error);
      // Не останавливаем весь процесс из-за ошибки MQTT
    }
  }

  /**
   * Регистрация устройства в системе
   */
  async registerDevice(): Promise<void> {
    try {
      this.logger.log(`Регистрация устройства: ${this.config.deviceId}`);

      // Получаем публичный ключ от криптографического чипа
      const publicKey = this.cryptoChip.getPublicKey();

      // Подготавливаем данные для регистрации согласно GenerateDeviceQRSchema
      const registrationData = {
        deviceId: this.config.deviceId,
        model: this.config.model,
        firmwareVersion: this.config.firmwareVersion,
        publicKeyPem: publicKey,
        qrType: 'token' as const, // используем token-based QR код
      };

      this.logger.log(
        'Отправка запроса на регистрацию устройства...',
        registrationData
      );

      // Отправляем реальный HTTP-запрос на backend
      const url = `${this.config.backendUrl}/manufacturing/generate-device-qr`;
      const response = await firstValueFrom(
        this.httpService.post(url, registrationData)
      );

      this.logger.log('Устройство успешно зарегистрировано:', response.data);
      this.deviceState.status = 'registered';

      // Запускаем процесс получения сертификата
      await this.requestCertificate();
    } catch (error) {
      this.logger.error('Ошибка регистрации устройства:', error);
      this.deviceState.status = 'error';
      this.deviceState.lastError =
        error instanceof Error ? error.message : 'Unknown error';

      // Логируем дополнительную информацию об ошибке HTTP
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as {
          response?: { status?: number; data?: unknown };
        };
        this.logger.error('HTTP Error Response:', {
          status: httpError.response?.status,
          data: httpError.response?.data,
        });
      }
    }
  }

  /**
   * Запрос сертификата для устройства
   */
  async requestCertificate(): Promise<void> {
    try {
      this.logger.log('Запрос сертификата для устройства');

      // Генерируем CSR с помощью криптографического чипа
      const csrData = await this.cryptoChip.generateCSR(this.config.deviceId);

      // Подготавливаем данные для запроса согласно SignCSRSchema
      const csrRequest = {
        csrPem: csrData.csr,
        firmwareVersion: this.config.firmwareVersion,
      };

      this.logger.log('Отправка запроса на подпись CSR...', {
        deviceId: this.config.deviceId,
      });

      // Отправляем реальный HTTP-запрос на backend
      const url = `${this.config.backendUrl}/devices/certificates/${this.config.deviceId}/sign-csr`;
      const response = await firstValueFrom(
        this.httpService.post(url, csrRequest)
      );

      this.logger.log('Сертификат получен:', {
        fingerprint: response.data.fingerprint,
        hasCA: !!response.data.caCertificate,
      });
      this.deviceState.certificateFingerprint = response.data.fingerprint;
    } catch (error) {
      this.logger.error('Ошибка получения сертификата:', error);
      this.deviceState.status = 'error';
      this.deviceState.lastError =
        error instanceof Error ? error.message : 'Certificate error';

      // Логируем дополнительную информацию об ошибке HTTP
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as {
          response?: { status?: number; data?: unknown };
        };
        this.logger.error('HTTP Error Response:', {
          status: httpError.response?.status,
          data: httpError.response?.data,
        });
      }
    }
  }

  /**
   * Привязка устройства к пользователю
   */
  async bindToUser(userId: string): Promise<void> {
    try {
      this.logger.log(`Привязка устройства к пользователю: ${userId}`);

      const bindData = {
        id: this.config.deviceId,
        ownerId: userId,
      };

      // Mock HTTP request for binding
      this.logger.log('Mock bind request:', bindData);
      const response = {
        data: {
          message: 'Device bound successfully',
          deviceId: this.config.deviceId,
          userId: userId,
        },
      };

      this.logger.log('Устройство успешно привязано:', response.data);
      this.deviceState.status = 'bound';
      this.deviceState.ownerId = userId;
    } catch (error) {
      this.logger.error('Ошибка привязки устройства:', error);
      this.deviceState.status = 'error';
      this.deviceState.lastError =
        error instanceof Error ? error.message : 'Binding error';
    }
  }
  /**
   * Генерация тестового CSR
   */
  async generateTestCSR(): Promise<{
    csr: string;
    publicKey: string;
    deviceId: string;
  }> {
    if (!this.config) {
      throw new Error('Устройство не сконфигурировано');
    }

    this.logger.log('Генерация тестового CSR');
    const csrData = await this.cryptoChip.generateCSR(this.config.deviceId);

    return {
      csr: csrData.csr,
      publicKey: csrData.publicKey,
      deviceId: csrData.deviceId,
    };
  }

  /**
   * Получение состояния устройства
   */
  getDeviceState(): DeviceState {
    return { ...this.deviceState };
  }

  /**
   * Получение конфигурации устройства
   */
  getDeviceConfig(): DeviceConfig | undefined {
    return this.config ? { ...this.config } : undefined;
  }

  /**
   * Получение текущих показаний сенсоров
   */
  getSensorData(): SensorData {
    return { ...this.currentSensorData };
  }

  /**
   * Получение информации о криптографическом чипе
   */
  getCryptoChipInfo() {
    return this.cryptoChip.getChipInfo();
  }

  /**
   * Симуляция работы сенсоров
   */
  private startSensorSimulation(): void {
    this.logger.log('Запуск симуляции сенсоров');

    // Обновляем показания каждые 5 секунд
    this.sensorUpdateInterval = setInterval(() => {
      this.updateSensorData();
    }, 5000);
  }

  /**
   * Обновление данных сенсоров
   */
  private updateSensorData(): void {
    // Симулируем реалистичные изменения показаний
    this.currentSensorData = {
      temperature: this.addRandomVariation(
        this.currentSensorData.temperature,
        0.5,
        15,
        35
      ),
      humidity: this.addRandomVariation(
        this.currentSensorData.humidity,
        2,
        30,
        80
      ),
      pressure: this.addRandomVariation(
        this.currentSensorData.pressure,
        1,
        1000,
        1030
      ),
      timestamp: new Date(),
    };

    this.logger.debug('Обновлены показания сенсоров:', this.currentSensorData);
  }

  /**
   * Добавление случайной вариации к значению
   */
  private addRandomVariation(
    currentValue: number,
    maxChange: number,
    minValue: number,
    maxValue: number
  ): number {
    const change = (Math.random() - 0.5) * 2 * maxChange;
    const newValue = currentValue + change;
    return Math.max(minValue, Math.min(maxValue, newValue));
  }

  /**
   * Остановка симуляции
   */
  async stopSimulation(): Promise<void> {
    this.logger.log('Остановка симуляции устройства');

    if (this.sensorUpdateInterval) {
      clearInterval(this.sensorUpdateInterval);
      this.sensorUpdateInterval = undefined;
    }

    // Отключаем MQTT
    await this.mqttDevice.disconnect();
  }

  /**
   * Получение статуса MQTT подключения
   */
  getMqttStatus() {
    return this.mqttDevice.getConnectionStatus();
  }
}
