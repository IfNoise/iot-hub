import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { MqttRpcClient } from '@iot-hub/shared';

export interface MqttDeviceConfig {
  brokerUrl: string;
  userId: string;
  deviceId: string;
  token?: string;
  qos?: 0 | 1 | 2;
  useTls?: boolean;
  securePort?: number;
  tls?: {
    ca?: string | Buffer;
    cert?: string | Buffer;
    key?: string | Buffer;
    servername?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface RpcRequest {
  id: string;
  deviceId: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface DeviceDataProvider {
  getDeviceState(): unknown;
  getDeviceConfig(): unknown;
  getCryptoChipInfo(): unknown;
  getSensorData(): unknown;
}

/**
 * MQTT сервис для симулятора устройства
 * Обрабатывает входящие RPC команды от backend
 */
@Injectable()
export class MqttDeviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttDeviceService.name);
  private mqttClient?: MqttRpcClient;
  private config?: MqttDeviceConfig;
  private isConnected = false;
  private dataProvider?: DeviceDataProvider;

  async onModuleInit() {
    this.logger.log('Инициализация MQTT сервиса устройства');
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Установка провайдера данных устройства
   */
  setDataProvider(provider: DeviceDataProvider): void {
    this.dataProvider = provider;
  }

  /**
   * Конфигурирование и подключение к MQTT брокеру
   */
  async configure(config: MqttDeviceConfig): Promise<void> {
    this.config = config;
    this.logger.log(`Настройка MQTT для устройства ${config.deviceId}`);

    try {
      const mqttOptions = {
        brokerUrl: config.brokerUrl,
        userId: config.userId,
        deviceId: config.deviceId,
        token: config.token,
        qos: config.qos ?? 1,
        willPayload: JSON.stringify({
          status: 'offline',
          timestamp: new Date().toISOString(),
        }),
        useTls: config.useTls,
        securePort: config.securePort,
        tls: config.tls,
      };

      this.mqttClient = new MqttRpcClient(mqttOptions);

      // Настраиваем обработчики событий
      this.setupEventHandlers();

      // Подключаемся к брокеру
      await this.mqttClient.connect();
      this.isConnected = true;

      // Подписываемся на команды
      await this.subscribeToCommands();

      const connectionType = config.useTls ? 'mTLS' : 'TCP';
      this.logger.log(`MQTT клиент успешно подключен через ${connectionType}`);
    } catch (error) {
      this.logger.error('Ошибка настройки MQTT клиента:', error);
      throw error;
    }
  }

  /**
   * Отключение от MQTT брокера
   */
  async disconnect(): Promise<void> {
    if (this.mqttClient && this.isConnected) {
      this.logger.log('Отключение от MQTT брокера');
      await this.mqttClient.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Настройка обработчиков событий MQTT
   */
  private setupEventHandlers(): void {
    if (!this.mqttClient) return;

    this.mqttClient.on('connect', () => {
      this.logger.log('Подключен к MQTT брокеру');
      this.isConnected = true;
    });

    this.mqttClient.on('disconnect', () => {
      this.logger.warn('Отключен от MQTT брокера');
      this.isConnected = false;
    });

    this.mqttClient.on('error', (error: Error) => {
      this.logger.error('Ошибка MQTT:', error.message);
      this.isConnected = false;
    });

    this.mqttClient.on('message', (topic: string, payload: Buffer) => {
      this.handleIncomingMessage(topic, payload);
    });
  }

  /**
   * Подписка на топики команд
   */
  private async subscribeToCommands(): Promise<void> {
    if (!this.mqttClient || !this.config) return;

    const commandTopic = `users/${this.config.userId}/devices/${this.config.deviceId}/rpc/request`;
    await this.mqttClient.subscribe(commandTopic);
    this.logger.log(`Подписан на команды: ${commandTopic}`);
  }

  /**
   * Обработка входящих сообщений
   */
  private async handleIncomingMessage(
    topic: string,
    payload: Buffer
  ): Promise<void> {
    try {
      const message = JSON.parse(payload.toString()) as RpcRequest;
      this.logger.log(`Получена команда ${message.method} (ID: ${message.id})`);

      // Обрабатываем команду
      const response = await this.handleRpcCommand(message);

      // Отправляем ответ
      await this.sendResponse(message.id, response);
    } catch (error) {
      this.logger.error('Ошибка обработки сообщения:', error);
    }
  }

  /**
   * Обработка RPC команды
   */
  private async handleRpcCommand(request: RpcRequest): Promise<RpcResponse> {
    const { id, method, params } = request;

    try {
      let result: unknown;

      switch (method) {
        case 'getDeviceState':
          result = await this.handleGetDeviceState();
          break;

        case 'getSensors':
          result = await this.handleGetSensors();
          break;

        case 'reboot':
          result = await this.handleReboot();
          break;

        case 'updateDiscreteTimer':
          result = await this.handleUpdateDiscreteTimer(params);
          break;

        case 'updateAnalogTimer':
          result = await this.handleUpdateAnalogTimer(params);
          break;

        case 'updateDiscreteRegulator':
          result = await this.handleUpdateDiscreteRegulator(params);
          break;

        case 'updateAnalogRegulator':
          result = await this.handleUpdateAnalogRegulator(params);
          break;

        case 'updateIrrigator':
          result = await this.handleUpdateIrrigator(params);
          break;

        default:
          throw new Error(`Неизвестный метод: ${method}`);
      }

      return {
        id,
        result,
      };
    } catch (error) {
      this.logger.error(`Ошибка выполнения команды ${method}:`, error);
      return {
        id,
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Отправка ответа на команду
   */
  private async sendResponse(
    requestId: string,
    response: RpcResponse
  ): Promise<void> {
    if (!this.mqttClient || !this.config) return;

    const responseTopic = `users/${this.config.userId}/devices/${this.config.deviceId}/rpc/response`;
    const payload = JSON.stringify(response);

    await this.mqttClient.publish(responseTopic, payload);
    this.logger.log(`Отправлен ответ на команду (ID: ${requestId})`);
  }

  // ======================
  // Обработчики RPC команд
  // ======================

  /**
   * Получить состояние устройства
   */
  private async handleGetDeviceState(): Promise<unknown> {
    if (!this.dataProvider) {
      throw new Error('Data provider не настроен');
    }

    const deviceState = this.dataProvider.getDeviceState();
    const config = this.dataProvider.getDeviceConfig();
    const cryptoInfo = this.dataProvider.getCryptoChipInfo();

    return {
      device: deviceState,
      config,
      cryptoChip: cryptoInfo,
      mqtt: {
        connected: this.isConnected,
        brokerUrl: this.config?.brokerUrl,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Получить данные сенсоров
   */
  private async handleGetSensors(): Promise<unknown> {
    if (!this.dataProvider) {
      throw new Error('Data provider не настроен');
    }

    return this.dataProvider.getSensorData();
  }

  /**
   * Перезагрузить устройство
   */
  private async handleReboot(): Promise<unknown> {
    this.logger.log('Имитация перезагрузки устройства');

    // Имитируем процесс перезагрузки
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      message: 'Устройство перезагружено',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обновить дискретный таймер
   */
  private async handleUpdateDiscreteTimer(
    params?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.log('Обновление дискретного таймера:', params);

    return {
      message: 'Дискретный таймер обновлен',
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обновить аналоговый таймер
   */
  private async handleUpdateAnalogTimer(
    params?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.log('Обновление аналогового таймера:', params);

    return {
      message: 'Аналоговый таймер обновлен',
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обновить дискретный регулятор
   */
  private async handleUpdateDiscreteRegulator(
    params?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.log('Обновление дискретного регулятора:', params);

    return {
      message: 'Дискретный регулятор обновлен',
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обновить аналоговый регулятор
   */
  private async handleUpdateAnalogRegulator(
    params?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.log('Обновление аналогового регулятора:', params);

    return {
      message: 'Аналоговый регулятор обновлен',
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обновить настройки ирригатора
   */
  private async handleUpdateIrrigator(
    params?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.log('Обновление настроек ирригатора:', params);

    return {
      message: 'Настройки ирригатора обновлены',
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Получить статус подключения
   */
  getConnectionStatus(): { connected: boolean; brokerUrl?: string } {
    return {
      connected: this.isConnected,
      brokerUrl: this.config?.brokerUrl,
    };
  }
}
