import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service';

export interface DeviceConfig {
  deviceId: string;
  model: string;
  firmwareVersion: string;
  backendUrl: string;
  autoRegister: boolean;
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
export class DeviceSimulatorService implements OnModuleInit {
  private readonly logger = new Logger(DeviceSimulatorService.name);
  private deviceState: DeviceState;
  private config: DeviceConfig;
  private sensorUpdateInterval?: NodeJS.Timeout;
  private currentSensorData: SensorData;

  constructor(
    // private readonly httpService: HttpService,
    private readonly cryptoChip: CryptoChipService
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

    if (config.autoRegister) {
      await this.registerDevice();
    }

    // Запуск симуляции сенсоров
    this.startSensorSimulation();
  }

  /**
   * Регистрация устройства в системе
   */
  async registerDevice(): Promise<void> {
    try {
      this.logger.log(`Регистрация устройства: ${this.config.deviceId}`);

      // Получаем публичный ключ от криптографического чипа
      const publicKey = this.cryptoChip.getPublicKey();

      // Отправляем запрос на регистрацию устройства
      const registrationData = {
        id: this.config.deviceId,
        model: this.config.model,
        publicKey: publicKey,
        firmwareVersion: this.config.firmwareVersion,
      };

      // Mock HTTP request for now
      this.logger.log('Mock registration request:', registrationData);
      const response = {
        data: { message: 'Device registered', device: registrationData },
      };

      this.logger.log('Устройство успешно зарегистрировано:', response.data);
      this.deviceState.status = 'registered';

      // Запускаем процесс получения сертификата
      await this.requestCertificate();
    } catch (error) {
      this.logger.error('Ошибка регистрации устройства:', error);
      this.deviceState.status = 'error';
      this.deviceState.lastError =
        error instanceof Error ? error.message : 'Unknown error';
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

      // Отправляем CSR на подпись
      const csrRequest = {
        csrPem: csrData.csr,
        firmwareVersion: this.config.firmwareVersion,
      };

      // Mock HTTP request for certificate
      this.logger.log('Mock CSR request:', csrRequest);
      const response = {
        data: {
          certificate: 'mock-certificate-pem',
          caCertificate: 'mock-ca-certificate-pem',
          fingerprint: 'mock-fingerprint-' + Date.now(),
        },
      };

      this.logger.log('Сертификат получен:', response.data);
      this.deviceState.certificateFingerprint = response.data.fingerprint;
    } catch (error) {
      this.logger.error('Ошибка получения сертификата:', error);
      this.deviceState.status = 'error';
      this.deviceState.lastError =
        error instanceof Error ? error.message : 'Certificate error';
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
  }
}
