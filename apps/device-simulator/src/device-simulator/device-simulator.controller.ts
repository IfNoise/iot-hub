import {
  Controller,
  Post,
  Get,
  Put,
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
}

export interface BindDeviceDto {
  userId: string;
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
   * Привязка устройства к пользователю
   */
  @Put('bind')
  async bindDevice(@Body() dto: BindDeviceDto) {
    try {
      this.logger.log(`Привязка устройства к пользователю: ${dto.userId}`);
      await this.deviceSimulator.bindToUser(dto.userId);

      return {
        success: true,
        message: 'Устройство успешно привязано к пользователю',
        userId: dto.userId,
      };
    } catch (error) {
      this.logger.error('Ошибка привязки устройства:', error);
      throw new HttpException(
        'Ошибка привязки устройства',
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

      return {
        device: state,
        config,
        cryptoChip: cryptoInfo,
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
}
