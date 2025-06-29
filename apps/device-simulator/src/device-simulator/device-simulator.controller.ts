import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  DeviceSimulatorService,
  DeviceConfig,
} from './device-simulator.service';

export interface ConfigureDeviceDto {
  deviceId: string;
  model: string;
  firmwareVersion: string;
  backendUrl: string;
  autoRegister?: boolean;
  // MQTT конфигурация с поддержкой mTLS
  mqtt?: {
    brokerUrl: string;
    userId?: string;
    token?: string;
    qos?: 0 | 1 | 2;
    useTls?: boolean;
    securePort?: number;
    autoObtainCertificates?: boolean;
    certsDir?: string;
  };
}

export interface BindDeviceDto {
  userId: string;
}

export interface SaveCertificatesDto {
  certificate: string;
  caCertificate: string;
  fingerprint: string;
}

/**
 * Контроллер для управления симулятором устройства
 */
@Controller('simulator')
export class DeviceSimulatorController {
  private readonly logger = new Logger(DeviceSimulatorController.name);

  constructor(private readonly deviceSimulator: DeviceSimulatorService) {}

  /**
   * Конфигурирование устройства
   */
  @Post('configure')
  async configureDevice(@Body() dto: ConfigureDeviceDto) {
    try {
      this.logger.log(`Конфигурирование устройства: ${dto.deviceId}`);

      const config: DeviceConfig = {
        deviceId: dto.deviceId,
        model: dto.model,
        firmwareVersion: dto.firmwareVersion,
        backendUrl: dto.backendUrl,
        autoRegister: dto.autoRegister ?? true,
        mqtt: dto.mqtt,
      };

      await this.deviceSimulator.configureDevice(config);

      return {
        success: true,
        message: 'Устройство успешно сконфигурировано',
        deviceId: dto.deviceId,
      };
    } catch (error) {
      this.logger.error('Ошибка конфигурирования устройства:', error);
      throw new HttpException(
        'Ошибка конфигурирования устройства',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Ручная регистрация устройства
   */
  @Post('register')
  async registerDevice() {
    try {
      this.logger.log('Ручная регистрация устройства');
      await this.deviceSimulator.registerDevice();

      return {
        success: true,
        message: 'Устройство успешно зарегистрировано',
      };
    } catch (error) {
      this.logger.error('Ошибка регистрации устройства:', error);
      throw new HttpException(
        'Ошибка регистрации устройства',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Генерация CSR для тестирования
   */
  @Post('generate-csr')
  async generateCSR() {
    try {
      this.logger.log('Генерация CSR для тестирования');
      const csrData = await this.deviceSimulator.generateTestCSR();

      return {
        success: true,
        message: 'CSR успешно сгенерирован',
        csr: csrData.csr,
        publicKey: csrData.publicKey,
        deviceId: csrData.deviceId,
      };
    } catch (error) {
      this.logger.error('Ошибка генерации CSR:', error);
      throw new HttpException(
        'Ошибка генерации CSR',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Привязка устройства к пользователю
   */
  @Post('bind')
  async bindDevice(@Body() bindData: { userId: string }) {
    try {
      this.logger.log(`Привязка устройства к пользователю: ${bindData.userId}`);
      await this.deviceSimulator.bindToUser(bindData.userId);

      return {
        success: true,
        message: 'Устройство успешно привязано к пользователю',
      };
    } catch (error) {
      this.logger.error('Ошибка привязки устройства:', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Ошибка привязки устройства',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получение состояния устройства
   */
  @Get('status')
  getDeviceStatus() {
    try {
      const state = this.deviceSimulator.getDeviceState();
      const config = this.deviceSimulator.getDeviceConfig();
      const cryptoInfo = this.deviceSimulator.getCryptoChipInfo();
      const mqttStatus = this.deviceSimulator.getMqttStatus();

      return {
        device: state,
        config,
        cryptoChip: cryptoInfo,
        mqtt: mqttStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения состояния устройства:', error);
      throw new HttpException(
        'Ошибка получения состояния устройства',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получение данных сенсоров
   */
  @Get('sensors')
  getSensorData() {
    try {
      const sensorData = this.deviceSimulator.getSensorData();

      return {
        success: true,
        data: sensorData,
      };
    } catch (error) {
      this.logger.error('Ошибка получения данных сенсоров:', error);
      throw new HttpException(
        'Ошибка получения данных сенсоров',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получение информации о криптографическом чипе
   */
  @Get('crypto-chip')
  getCryptoChipInfo() {
    try {
      const cryptoInfo = this.deviceSimulator.getCryptoChipInfo();

      return {
        success: true,
        data: cryptoInfo,
      };
    } catch (error) {
      this.logger.error(
        'Ошибка получения информации о криптографическом чипе:',
        error
      );
      throw new HttpException(
        'Ошибка получения информации о криптографическом чипе',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Остановка симуляции устройства
   */
  @Post('stop')
  async stopSimulation() {
    try {
      this.logger.log('Остановка симуляции устройства');
      await this.deviceSimulator.stopSimulation();

      return {
        success: true,
        message: 'Симуляция устройства остановлена',
      };
    } catch (error) {
      this.logger.error('Ошибка остановки симуляции:', error);
      throw new HttpException(
        'Ошибка остановки симуляции',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получение статуса MQTT подключения
   */
  @Get('mqtt/status')
  getMqttStatus() {
    try {
      const mqttStatus = this.deviceSimulator.getMqttStatus();

      return {
        success: true,
        mqtt: mqttStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения статуса MQTT:', error);
      throw new HttpException(
        'Ошибка получения статуса MQTT',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Принудительное переподключение к MQTT брокеру
   */
  @Post('mqtt/reconnect')
  async reconnectMqtt() {
    try {
      this.logger.log('Запрос на переподключение к MQTT брокеру');
      await this.deviceSimulator.reconnectMqtt();

      return {
        success: true,
        message: 'Переподключение к MQTT брокеру завершено',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка переподключения к MQTT:', error);
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Ошибка переподключения к MQTT',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Автоматическая конфигурация устройства из переменных окружения
   */
  @Post('auto-configure')
  async autoConfigureDevice() {
    try {
      this.logger.log(
        'Автоматическая конфигурация устройства из переменных окружения'
      );

      // Получаем конфигурацию из переменных окружения
      const config: DeviceConfig = {
        deviceId: process.env.DEVICE_ID || 'test-device-001',
        model: process.env.DEVICE_MODEL || 'IoT-Simulator-v1',
        firmwareVersion: process.env.FIRMWARE_VERSION || '1.0.0',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
        autoRegister: process.env.AUTO_REGISTER === 'true',
        mqtt: {
          brokerUrl: this.buildMqttUrl(),
          userId: process.env.USER_ID || 'test-user',
          token: process.env.MQTT_TOKEN,
          qos: this.parseQoS(process.env.MQTT_QOS),
          useTls: process.env.USE_MTLS === 'true',
          securePort: parseInt(process.env.MQTT_SECURE_PORT || '8883', 10),
          autoObtainCertificates:
            process.env.AUTO_OBTAIN_CERTIFICATES === 'true',
          certsDir: process.env.CERTS_DIR || './certs/devices',
        },
      };

      await this.deviceSimulator.configureDevice(config);

      return {
        success: true,
        message: 'Устройство автоматически сконфигурировано',
        config: {
          deviceId: config.deviceId,
          model: config.model,
          firmwareVersion: config.firmwareVersion,
          backendUrl: config.backendUrl,
          useMtls: config.mqtt?.useTls,
          mqttBroker: config.mqtt?.brokerUrl,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка автоматической конфигурации:', error);
      throw new HttpException(
        `Ошибка автоматической конфигурации: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Запрос сертификатов для устройства
   */
  @Post('certificates/request')
  async requestCertificates() {
    try {
      this.logger.log('Запрос сертификатов для устройства');
      await this.deviceSimulator.requestCertificate();

      return {
        success: true,
        message: 'Сертификаты успешно получены',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения сертификатов:', error);
      throw new HttpException(
        'Ошибка получения сертификатов',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Сохранение полученных сертификатов
   */
  @Post('certificates/save')
  async saveCertificates(@Body() certificatesDto: SaveCertificatesDto) {
    try {
      this.logger.log('Сохранение полученных сертификатов');
      await this.deviceSimulator.saveCertificates(
        certificatesDto.certificate,
        certificatesDto.caCertificate,
        certificatesDto.fingerprint
      );

      return {
        success: true,
        message: 'Сертификаты успешно сохранены',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка сохранения сертификатов:', error);
      throw new HttpException(
        'Ошибка сохранения сертификатов',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Автоконфигурация устройства для быстрого старта
   */
  @Post('quick-start')
  async quickStart() {
    try {
      this.logger.log('Автоконфигурация устройства для быстрого старта');

      // Устанавливаем базовую конфигурацию устройства с mTLS
      const baseConfig: DeviceConfig = {
        deviceId: 'mTLS-test-device-' + Date.now(),
        model: 'QuickStartModel',
        firmwareVersion: '1.0.0',
        backendUrl: 'http://localhost:3000',
        autoRegister: true,
        mqtt: {
          brokerUrl: 'mqtts://localhost:8883',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          token: 'quickstart-token',
          qos: 1,
          useTls: true,
          securePort: 8883,
          autoObtainCertificates: true,
          certsDir: './certs',
        },
      };

      await this.deviceSimulator.configureDevice(baseConfig);

      return {
        success: true,
        message: 'Устройство успешно сконфигурировано для быстрого старта',
        deviceId: baseConfig.deviceId,
      };
    } catch (error) {
      this.logger.error('Ошибка автоконфигурации для быстрого старта:', error);
      throw new HttpException(
        'Ошибка автоконфигурации для быстрого старта',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Построение URL для MQTT брокера на основе настроек TLS
   */
  private buildMqttUrl(): string {
    const host = process.env.MQTT_HOST || 'localhost';
    const useTls = process.env.USE_MTLS === 'true';

    if (useTls) {
      const securePort = process.env.MQTT_SECURE_PORT || '8883';
      return `mqtts://${host}:${securePort}`;
    } else {
      const port = process.env.MQTT_PORT || '1883';
      return `mqtt://${host}:${port}`;
    }
  }

  /**
   * Парсинг QoS уровня из строки
   */
  private parseQoS(qosStr?: string): 0 | 1 | 2 {
    if (!qosStr) return 1;

    const qos = parseInt(qosStr, 10);
    if (qos === 0 || qos === 1 || qos === 2) {
      return qos as 0 | 1 | 2;
    }

    return 1; // Значение по умолчанию
  }
}
