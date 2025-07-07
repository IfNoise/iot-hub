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
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiProperty,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  DeviceSimulatorService,
  DeviceConfig,
} from './device-simulator.service.js';
import type { QRCodeType } from './qr-generator.service.js';

export class MqttConfigDto {
  @ApiProperty({
    description: 'URL MQTT брокера',
    example: 'mqtt://localhost:1883',
  })
  brokerUrl!: string;

  @ApiProperty({
    description: 'Идентификатор пользователя',
    example: 'user-123',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description: 'Токен для аутентификации MQTT',
    example: 'mqtt-token-123',
    required: false,
  })
  token?: string;

  @ApiProperty({
    description: 'Уровень Quality of Service',
    enum: [0, 1, 2],
    example: 1,
    required: false,
  })
  qos?: 0 | 1 | 2;

  @ApiProperty({
    description: 'Использовать TLS/mTLS соединение',
    example: true,
    required: false,
  })
  useTls?: boolean;

  @ApiProperty({
    description: 'Порт для безопасного соединения',
    example: 8883,
    required: false,
  })
  securePort?: number;

  @ApiProperty({
    description: 'Автоматически получать сертификаты',
    example: true,
    required: false,
  })
  autoObtainCertificates?: boolean;

  @ApiProperty({
    description: 'Директория для хранения сертификатов',
    example: './certs/devices',
    required: false,
  })
  certsDir?: string;
}

export class ConfigureDeviceDto {
  @ApiProperty({
    description: 'Уникальный идентификатор устройства',
    example: 'ESP32-TEST-12345',
  })
  deviceId!: string;

  @ApiProperty({
    description: 'Модель устройства',
    example: 'ESP32-DevKit-V1',
  })
  model!: string;

  @ApiProperty({
    description: 'Версия прошивки устройства',
    example: '1.0.0',
  })
  firmwareVersion!: string;

  @ApiProperty({
    description: 'URL backend сервера',
    example: 'http://localhost:3000',
  })
  backendUrl!: string;

  @ApiProperty({
    description: 'Автоматически регистрировать устройство после конфигурации',
    example: true,
    required: false,
    default: true,
  })
  autoRegister?: boolean;

  @ApiProperty({
    description: 'Конфигурация MQTT с поддержкой mTLS',
    type: MqttConfigDto,
    required: false,
  })
  mqtt?: MqttConfigDto;
}

export class BindDeviceDto {
  @ApiProperty({
    description: 'Идентификатор пользователя для привязки устройства',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;
}

export class SaveCertificatesDto {
  @ApiProperty({
    description: 'Клиентский сертификат в формате PEM',
    example: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
  })
  certificate!: string;

  @ApiProperty({
    description: 'CA сертификат в формате PEM',
    example: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
  })
  caCertificate!: string;

  @ApiProperty({
    description: 'Отпечаток сертификата',
    example: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
  })
  fingerprint!: string;
}

export class QRCodeRequestDto {
  @ApiProperty({
    description: 'Тип QR-кода',
    enum: ['minimal', 'token', 'hash'],
    example: 'token',
    required: false,
    default: 'token',
  })
  type?: QRCodeType;
}

/**
 * Контроллер для управления симулятором устройства
 */
@ApiTags('Device Simulator')
@Controller('simulator')
export class DeviceSimulatorController {
  private readonly logger = new Logger(DeviceSimulatorController.name);

  constructor(private readonly deviceSimulator: DeviceSimulatorService) {}

  /**
   * Конфигурирование устройства
   */
  @Post('configure')
  @ApiOperation({
    summary: 'Конфигурирование устройства',
    description:
      'Настройка симулятора IoT устройства с MQTT и mTLS поддержкой. После конфигурации устройство может быть автоматически зарегистрировано.',
  })
  @ApiBody({
    type: ConfigureDeviceDto,
    description: 'Конфигурация устройства',
  })
  @ApiOkResponse({
    description: 'Устройство успешно сконфигурировано',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Устройство успешно сконфигурировано',
        },
        deviceId: { type: 'string', example: 'ESP32-TEST-12345' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Некорректные данные конфигурации',
  })
  @ApiInternalServerErrorResponse({
    description: 'Внутренняя ошибка сервера',
  })
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
  @ApiOperation({
    summary: 'Ручная регистрация устройства',
    description:
      'Регистрирует устройство в системе и генерирует QR-код для привязки. Устройство должно быть предварительно сконфигурировано.',
  })
  @ApiOkResponse({
    description: 'Устройство успешно зарегистрировано',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Устройство успешно зарегистрировано',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Устройство не сконфигурировано',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка регистрации устройства',
  })
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
  @ApiOperation({
    summary: 'Генерация CSR для тестирования',
    description:
      'Генерирует Certificate Signing Request (CSR) для тестирования системы сертификатов. Возвращает CSR и публичный ключ.',
  })
  @ApiOkResponse({
    description: 'CSR успешно сгенерирован',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'CSR успешно сгенерирован' },
        csr: {
          type: 'string',
          example:
            '-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----',
        },
        publicKey: {
          type: 'string',
          example: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----',
        },
        deviceId: { type: 'string', example: 'ESP32-TEST-12345' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Устройство не сконфигурировано',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка генерации CSR',
  })
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
  @ApiOperation({
    summary: 'Привязка устройства к пользователю',
    description:
      'Привязывает симулятор устройства к указанному пользователю. Устройство должно быть предварительно зарегистрировано.',
  })
  @ApiBody({
    type: BindDeviceDto,
    description: 'Данные для привязки устройства',
  })
  @ApiOkResponse({
    description: 'Устройство успешно привязано',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Устройство успешно привязано к пользователю',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Устройство не зарегистрировано или некорректный userId',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка привязки устройства',
  })
  async bindDevice(@Body() bindData: BindDeviceDto) {
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
  @ApiOperation({
    summary: 'Получение состояния устройства',
    description:
      'Возвращает полную информацию о состоянии симулятора устройства, включая конфигурацию, статус криптографического чипа и MQTT подключения.',
  })
  @ApiOkResponse({
    description: 'Состояние устройства',
    schema: {
      type: 'object',
      properties: {
        device: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ESP32-TEST-12345' },
            status: {
              type: 'string',
              enum: [
                'uninitialized',
                'initialized',
                'registered',
                'bound',
                'error',
              ],
              example: 'registered',
            },
            lastError: { type: 'string', nullable: true },
            certificateFingerprint: { type: 'string', nullable: true },
            ownerId: { type: 'string', nullable: true },
          },
        },
        config: {
          type: 'object',
          nullable: true,
          description: 'Конфигурация устройства',
        },
        cryptoChip: {
          type: 'object',
          description: 'Информация о криптографическом чипе',
        },
        mqtt: {
          type: 'object',
          description: 'Статус MQTT подключения',
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка получения состояния устройства',
  })
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
  @ApiOperation({
    summary: 'Получение данных сенсоров',
    description:
      'Возвращает текущие показания симулированных сенсоров устройства (температура, влажность, давление).',
  })
  @ApiOkResponse({
    description: 'Данные сенсоров успешно получены',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            temperature: {
              type: 'number',
              example: 23.5,
              description: 'Температура в градусах Цельсия',
            },
            humidity: {
              type: 'number',
              example: 65.2,
              description: 'Влажность в процентах',
            },
            pressure: {
              type: 'number',
              example: 1013.25,
              description: 'Давление в гПа',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Время измерения',
            },
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка получения данных сенсоров',
  })
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
  @ApiOperation({
    summary: 'Получение информации о криптографическом чипе',
    description:
      'Возвращает информацию о состоянии симулированного криптографического чипа устройства.',
  })
  @ApiOkResponse({
    description: 'Информация о криптографическом чипе',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Информация о криптографическом чипе',
          properties: {
            initialized: { type: 'boolean', example: true },
            deviceId: { type: 'string', example: 'ESP32-TEST-12345' },
            hasPublicKey: { type: 'boolean', example: true },
            hasPrivateKey: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка получения информации о криптографическом чипе',
  })
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
  @ApiOperation({
    summary: 'Остановка симуляции устройства',
    description:
      'Останавливает симуляцию устройства, отключает MQTT соединение и освобождает ресурсы.',
  })
  @ApiOkResponse({
    description: 'Симуляция успешно остановлена',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Симуляция устройства остановлена',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка остановки симуляции',
  })
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
  @ApiOperation({
    summary: 'Получение статуса MQTT подключения',
    description: 'Возвращает текущий статус MQTT подключения устройства.',
  })
  @ApiOkResponse({
    description: 'Статус MQTT подключения',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        mqtt: {
          type: 'object',
          properties: {
            connected: { type: 'boolean', example: true },
            connectionState: {
              type: 'string',
              enum: [
                'disconnected',
                'connecting',
                'connected',
                'reconnecting',
                'error',
              ],
              example: 'connected',
            },
            brokerUrl: { type: 'string', example: 'mqtts://localhost:8883' },
            lastConnected: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка получения статуса MQTT',
  })
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
  @ApiOperation({
    summary: 'Принудительное переподключение к MQTT брокеру',
    description:
      'Принудительно переподключается к MQTT брокеру. Используется для восстановления соединения после сбоев или изменения конфигурации.',
  })
  @ApiOkResponse({
    description: 'Переподключение к MQTT брокеру успешно завершено',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Переподключение к MQTT брокеру завершено',
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка переподключения к MQTT брокеру',
  })
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
  @ApiOperation({
    summary: 'Автоматическая конфигурация из переменных окружения',
    description:
      'Автоматически конфигурирует устройство на основе переменных окружения. Удобно для деплоя в контейнерах и автоматизации.',
  })
  @ApiOkResponse({
    description: 'Устройство автоматически сконфигурировано',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Устройство автоматически сконфигурировано',
        },
        config: {
          type: 'object',
          properties: {
            deviceId: { type: 'string', example: 'test-device-001' },
            model: { type: 'string', example: 'IoT-Simulator-v1' },
            firmwareVersion: { type: 'string', example: '1.0.0' },
            backendUrl: { type: 'string', example: 'http://localhost:3000' },
            useMtls: { type: 'boolean', example: true },
            mqttBroker: { type: 'string', example: 'mqtts://localhost:8883' },
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка автоматической конфигурации',
  })
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
  @ApiOperation({
    summary: 'Запрос сертификатов для устройства',
    description:
      'Инициирует процесс получения клиентских сертификатов для mTLS аутентификации. Отправляет CSR на backend и получает подписанный сертификат.',
  })
  @ApiOkResponse({
    description: 'Сертификаты успешно запрошены и получены',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Сертификаты успешно получены' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Устройство не сконфигурировано или не может сгенерировать CSR',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка получения сертификатов от backend',
  })
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
  @ApiOperation({
    summary: 'Сохранение полученных сертификатов',
    description:
      'Сохраняет клиентский сертификат, CA сертификат и отпечаток в файловой системе устройства для последующего использования в mTLS соединениях.',
  })
  @ApiBody({
    type: SaveCertificatesDto,
    description: 'Данные сертификатов для сохранения',
  })
  @ApiOkResponse({
    description: 'Сертификаты успешно сохранены',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Сертификаты успешно сохранены' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Некорректные данные сертификатов',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка сохранения сертификатов в файловую систему',
  })
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
  @ApiOperation({
    summary: 'Быстрый старт устройства',
    description:
      'Автоматически конфигурирует и регистрирует тестовое устройство с mTLS поддержкой. Идеально для демонстрации и тестирования.',
  })
  @ApiOkResponse({
    description: 'Устройство быстро сконфигурировано',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Устройство успешно сконфигурировано для быстрого старта',
        },
        deviceId: { type: 'string', example: 'mTLS-test-device-1672531200000' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка автоконфигурации',
  })
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

  /**
   * Генерация QR-кода для устройства
   */
  @Post('generate-qr')
  @ApiOperation({
    summary: 'Генерация QR-кода для устройства',
    description:
      'Генерирует QR-код указанного типа для привязки устройства. QR-код отображается в консоли сервера в ASCII формате.',
  })
  @ApiBody({
    type: QRCodeRequestDto,
    description: 'Параметры генерации QR-кода',
  })
  @ApiOkResponse({
    description: 'QR-код успешно сгенерирован',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'QR-код типа "token" сгенерирован и отображен в консоли',
        },
        type: {
          type: 'string',
          enum: ['minimal', 'token', 'hash'],
          example: 'token',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Устройство не сконфигурировано или неверный тип QR-кода',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка генерации QR-кода',
  })
  async generateQRCode(@Body() body: QRCodeRequestDto) {
    try {
      const type = body.type || 'token';
      this.logger.log(`Генерация QR-кода типа: ${type}`);

      await this.deviceSimulator.generateAndShowQRCode(type);

      return {
        success: true,
        message: `QR-код типа "${type}" сгенерирован и отображен в консоли`,
        type,
      };
    } catch (error) {
      this.logger.error('Ошибка генерации QR-кода:', error);
      throw new HttpException(
        'Ошибка генерации QR-кода',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Генерация QR-кодов всех типов для демонстрации
   */
  @Post('generate-all-qr-types')
  @ApiOperation({
    summary: 'Генерация всех типов QR-кодов',
    description:
      'Генерирует QR-коды всех доступных типов (minimal, token, hash) для демонстрации. Все QR-коды отображаются в консоли сервера.',
  })
  @ApiOkResponse({
    description: 'Все типы QR-кодов успешно сгенерированы',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Все типы QR-кодов сгенерированы и отображены в консоли',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          example: ['minimal', 'token', 'hash'],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Устройство не сконфигурировано',
  })
  @ApiInternalServerErrorResponse({
    description: 'Ошибка генерации QR-кодов',
  })
  async generateAllQRTypes() {
    try {
      this.logger.log('Генерация всех типов QR-кодов...');

      await this.deviceSimulator.generateAllQRTypes();

      return {
        success: true,
        message: 'Все типы QR-кодов сгенерированы и отображены в консоли',
        types: ['minimal', 'token', 'hash'],
      };
    } catch (error) {
      this.logger.error('Ошибка генерации всех типов QR-кодов:', error);
      throw new HttpException(
        'Ошибка генерации всех типов QR-кодов',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получение информации о типах QR-кодов
   */
  @Get('qr-types')
  @ApiOperation({
    summary: 'Получение информации о типах QR-кодов',
    description:
      'Возвращает описание всех доступных типов QR-кодов с их характеристиками (размер, безопасность, рекомендации).',
  })
  @ApiOkResponse({
    description: 'Информация о типах QR-кодов',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        types: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'token' },
              description: {
                type: 'string',
                example: 'С токеном (deviceId + bindingToken)',
              },
              estimatedSize: { type: 'string', example: '80-90 символов' },
              security: { type: 'string', example: 'Очень высокая' },
              recommended: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  getQRTypes() {
    return {
      success: true,
      types: [
        {
          type: 'minimal',
          description: 'Минимальный (deviceId + fingerprint)',
          estimatedSize: '70-80 символов',
          security: 'Средняя',
          recommended: false,
        },
        {
          type: 'token',
          description: 'С токеном (deviceId + bindingToken)',
          estimatedSize: '80-90 символов',
          security: 'Очень высокая',
          recommended: true,
        },
        {
          type: 'hash',
          description: 'С хешем (deviceId + fingerprint + keyHash)',
          estimatedSize: '110-120 символов',
          security: 'Высокая',
          recommended: false,
        },
      ],
    };
  }
}
