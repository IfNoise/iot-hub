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
    this.logger.debug(
      `MQTT конфигурация: ${JSON.stringify(config.mqtt, null, 2)}`
    );

    const mqttConfig: MqttDeviceConfig = {
      brokerUrl: config.mqtt.brokerUrl,
      userId: config.mqtt.userId || 'simulator-user',
      deviceId: config.deviceId,
      token: config.mqtt.token,
      qos: config.mqtt.qos || 1,
      useTls: config.mqtt.useTls,
      securePort: config.mqtt.securePort,
    };

    this.logger.debug(
      `Исходная mqttConfig: ${JSON.stringify(mqttConfig, null, 2)}`
    );

    // Если включен mTLS, получаем или генерируем сертификаты
    if (config.mqtt.useTls && config.mqtt.autoObtainCertificates) {
      this.logger.log('mTLS включен, получение сертификатов...');
      this.logger.debug(
        `useTls: ${config.mqtt.useTls}, autoObtainCertificates: ${config.mqtt.autoObtainCertificates}`
      );

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

          // Получаем новые сертификаты через стандартный метод
          await this.requestCertificate();

          // Перезагружаем сертификаты после получения
          mtlsConfig = this.mtlsConfig.loadCertificatesFromFiles(certPaths);
        }

        // Добавляем TLS конфигурацию к MQTT настройкам
        if (mtlsConfig && this.mtlsConfig.validateMtlsConfig(mtlsConfig)) {
          this.logger.log('Добавление TLS конфигурации к MQTT настройкам...');
          mqttConfig.tls = {
            ca: mtlsConfig.caCert,
            cert: mtlsConfig.clientCert,
            key: mtlsConfig.clientKey,
            rejectUnauthorized: mtlsConfig.rejectUnauthorized,
            servername: mtlsConfig.servername,
          };

          // Обновляем URL брокера для безопасного подключения
          // Извлекаем hostname из существующего URL
          let hostname = 'localhost';
          try {
            const url = new URL(config.mqtt.brokerUrl);
            hostname = url.hostname;
          } catch {
            // Если URL не валидный, используем как hostname напрямую
            hostname = config.mqtt.brokerUrl
              .replace(/^(mqtt|mqtts):\/\//, '')
              .split(':')[0];
          }

          const newBrokerUrl = `mqtts://${hostname}:${
            config.mqtt.securePort || 8883
          }`;
          this.logger.log(
            `Обновление brokerUrl: ${mqttConfig.brokerUrl} -> ${newBrokerUrl}`
          );
          mqttConfig.brokerUrl = newBrokerUrl;

          this.logger.log('mTLS конфигурация успешно настроена');
          this.logger.debug(
            `TLS настройки добавлены к mqttConfig. rejectUnauthorized: ${mtlsConfig.rejectUnauthorized}, servername: ${mtlsConfig.servername}`
          );
        } else {
          this.logger.error(
            'Неверная mTLS конфигурация, откат к незащищенному соединению'
          );
          this.logger.warn(
            `mtlsConfig: ${mtlsConfig}, validation: ${
              mtlsConfig
                ? this.mtlsConfig.validateMtlsConfig(mtlsConfig)
                : 'N/A'
            }`
          );
          mqttConfig.useTls = false;
          // Возвращаем URL брокера к незащищенному варианту
          const regularUrl = config.mqtt.brokerUrl
            .replace('mqtts://', 'mqtt://')
            .replace(':8883', ':1883');
          mqttConfig.brokerUrl = regularUrl;
        }
      } catch (error) {
        this.logger.error('Ошибка получения сертификатов mTLS:', error);
        this.logger.warn('Продолжение без mTLS...');
        mqttConfig.useTls = false;
        // Возвращаем URL брокера к незащищенному варианту
        const regularUrl = config.mqtt.brokerUrl
          .replace('mqtts://', 'mqtt://')
          .replace(':8883', ':1883');
        mqttConfig.brokerUrl = regularUrl;
      }
    }

    this.logger.log('Финальная настройка MQTT...');
    this.logger.debug(
      `Финальная mqttConfig: ${JSON.stringify(
        {
          ...mqttConfig,
          tls: mqttConfig.tls
            ? {
                ...mqttConfig.tls,
                ca: `[CA cert ${mqttConfig.tls.ca?.length || 0} символов]`,
                cert: `[Client cert ${
                  mqttConfig.tls.cert?.length || 0
                } символов]`,
                key: `[Key ${mqttConfig.tls.key?.length || 0} символов]`,
              }
            : undefined,
        },
        null,
        2
      )}`
    );

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
      const url = `${this.config.backendUrl}/api/manufacturing/generate-device-qr`;
      const response = await firstValueFrom(
        this.httpService.post(url, registrationData)
      );

      this.logger.log('Устройство успешно зарегистрировано:', response.data);
      this.deviceState.status = 'registered';

      // Запускаем процесс получения сертификата
      await this.requestCertificate();

      // Переконфигурируем MQTT с полученными сертификатами
      if (this.config.mqtt?.useTls) {
        this.logger.log('Переконфигурация MQTT с полученными сертификатами...');
        await this.configureMqtt(this.config);
      }
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

      if (!this.config) {
        throw new Error('Устройство не сконфигурировано');
      }

      // Используем certificateClient для получения сертификата
      const certificateResponse =
        await this.certificateClient.obtainCertificate(
          {
            deviceId: this.config.deviceId,
            firmwareVersion: this.config.firmwareVersion,
          },
          this.config.backendUrl
        );

      this.logger.log('Сертификат получен:', {
        fingerprint: certificateResponse.fingerprint,
        hasCA: !!certificateResponse.caCert,
      });

      // Сохраняем сертификаты
      await this.saveCertificates(
        certificateResponse.clientCert,
        certificateResponse.caCert,
        certificateResponse.fingerprint
      );

      this.deviceState.certificateFingerprint = certificateResponse.fingerprint;
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
    // Временно отключено для тестирования
    this.logger.log('Симуляция сенсоров отключена для тестирования');

    // this.logger.log('Запуск симуляции сенсоров');
    // // Обновляем показания каждые 5 секунд
    // this.sensorUpdateInterval = setInterval(() => {
    //   this.updateSensorData();
    // }, 5000);
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

  /**
   * Переподключение к MQTT брокеру
   */
  async reconnectMqtt(): Promise<void> {
    try {
      this.logger.log('Переподключение к MQTT брокеру...');
      await this.mqttDevice.reconnect();
      this.logger.log('Переподключение к MQTT успешно выполнено');
    } catch (error) {
      this.logger.error('Ошибка переподключения к MQTT:', error);
      throw error;
    }
  }

  /**
   * Сохранение сертификатов
   */
  async saveCertificates(
    certificate: string,
    caCertificate: string,
    fingerprint: string
  ): Promise<void> {
    try {
      this.logger.log('Сохранение полученных сертификатов...');

      if (!this.config) {
        throw new Error('Устройство не сконфигурировано');
      }

      const certsDir = this.config.mqtt?.certsDir || './certs/devices';

      // Получаем приватный ключ из криптографического чипа для сохранения
      const privateKey = this.cryptoChip.getPrivateKey();

      // Создаем объект сертификатов для сохранения
      const certificatesData = {
        caCert: caCertificate,
        clientCert: certificate,
        clientKey: privateKey, // Приватный ключ из криптографического чипа
      };

      // Сохраняем сертификаты в файлы
      await this.mtlsConfig.saveCertificatesToFiles(
        this.config.deviceId,
        certificatesData,
        certsDir
      );

      // Обновляем состояние устройства
      this.deviceState.certificateFingerprint = fingerprint;

      this.logger.log('Сертификаты успешно сохранены');
    } catch (error) {
      this.logger.error('Ошибка сохранения сертификатов:', error);
      throw error;
    }
  }
}
