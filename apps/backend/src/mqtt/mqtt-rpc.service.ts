import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '../config/config.service.js';
import { MqttRpcClient } from '@iot-hub/shared';
import type { RpcResponse } from '@iot-hub/shared';

/**
 * Сервис для отправки RPC команд устройствам через MQTT брокер
 *
 * Этот сервис управляет подключением к MQTT брокеру и предоставляет
 * методы для отправки команд устройствам с использованием RPC протокола.
 * Использует ConfigService для получения конфигурации и Pino для логирования.
 *
 * @example
 * ```typescript
 * // Отправка команды устройству
 * const response = await this.mqttRpcService.sendDeviceCommand(
 *   'user123',
 *   'device456',
 *   'getDeviceState',
 *   {}
 * );
 * ```
 */
@Injectable()
export class MqttRpcService implements OnModuleInit, OnModuleDestroy {
  private mqttClient: MqttRpcClient | null = null;
  private readonly connectionPromise: Promise<void>;
  private connectionResolver!: () => void;
  private connectionRejector!: (error: Error) => void;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(MqttRpcService.name)
    private readonly logger: PinoLogger
  ) {
    // Создаем Promise для отслеживания состояния подключения
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolver = resolve;
      this.connectionRejector = reject;
    });
  }

  /**
   * Инициализация модуля и подключение к MQTT брокеру
   */
  async onModuleInit(): Promise<void> {
    // Запускаем инициализацию MQTT в фоне, не блокируя старт приложения
    this.initializeMqttClient()
      .then(() => {
        this.isInitialized = true;
        this.logger.info('MQTT RPC сервис успешно инициализирован');
      })
      .catch((error) => {
        this.logger.error(
          { error },
          'Ошибка инициализации MQTT RPC сервиса. Сервис будет недоступен до успешного подключения.'
        );
        // Не выбрасываем ошибку, чтобы не блокировать старт приложения
      });
  }

  /**
   * Очистка ресурсов при завершении модуля
   */
  async onModuleDestroy(): Promise<void> {
    if (this.mqttClient) {
      this.logger.info('Отключение от MQTT брокера...');
      this.mqttClient.disconnect();
      this.mqttClient = null;
    }
    this.isInitialized = false;
  }

  /**
   * Инициализирует MQTT клиент и устанавливает подключение
   */
  private async initializeMqttClient(): Promise<void> {
    try {
      const mqttConfig = this.configService.getMqttConfig();
      const brokerUrl = this.configService.getMqttBrokerUrl();
      const isProduction = this.configService.isProduction();

      this.logger.info(
        {
          brokerUrl,
          clientId: mqttConfig.clientId,
          keepalive: mqttConfig.keepalive,
          qos: mqttConfig.qos,
          environment: isProduction ? 'production' : 'development',
          connectionType: isProduction ? 'TLS' : 'TCP',
        },
        'Инициализация MQTT клиента для backend'
      );

      // Получаем правильные опции подключения в зависимости от окружения
      const clientOptions =
        this.configService.mqtt.getBackendClientOptions(isProduction);

      this.mqttClient = new MqttRpcClient({
        brokerUrl,
        userId: 'backend-service',
        deviceId: 'backend',
        username: clientOptions.username as string,
        token: clientOptions.password as string,
        qos: mqttConfig.qos as 0 | 1 | 2,
        willPayload: mqttConfig.will?.payload,
        useTls: isProduction, // В продакшне используем TLS
        securePort: isProduction ? mqttConfig.securePort : undefined,
        tls:
          isProduction && mqttConfig.tls
            ? {
                ca: mqttConfig.tls.ca,
                rejectUnauthorized: true, // В продакшне проверяем сертификат
                servername: mqttConfig.tls.servername,
                // НЕ передаем клиентские сертификаты для backend
              }
            : undefined,
        logger: {
          log: (...args) => this.logger.info({ args }, 'MQTT Client'),
          warn: (...args) => this.logger.warn({ args }, 'MQTT Client'),
          error: (...args) => this.logger.error({ args }, 'MQTT Client'),
        },
      });

      // Настраиваем обработчики событий
      this.mqttClient.on('connect', () => {
        this.logger.info('Успешно подключен к MQTT брокеру');
        if (this.mqttClient) {
          // Подписываемся на все response topics с wildcard
          this.subscribeToAllResponseTopics().catch((error) => {
            this.logger.error('Ошибка подписки на response topics:', error);
          });
        }
        this.connectionResolver();
      });

      // Ждем подключения или таймаут
      const timeout = setTimeout(() => {
        const error = new Error('Timeout при подключении к MQTT брокеру');
        this.logger.error(
          { timeout: mqttConfig.connectTimeout },
          error.message
        );
        this.connectionRejector(error);
      }, mqttConfig.connectTimeout);

      await this.connectionPromise;
      clearTimeout(timeout);

      this.logger.info('MQTT RPC клиент успешно инициализирован');
    } catch (error) {
      this.logger.error({ error }, 'Ошибка при инициализации MQTT клиента');
      this.connectionRejector(error as Error);
      throw error;
    }
  }

  /**
   * Проверяет готовность сервиса к работе
   */
  private async ensureReady(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MQTT RPC сервис не инициализирован');
    }

    // Ждем подключения к MQTT брокеру
    await this.connectionPromise;

    if (!this.mqttClient) {
      throw new Error('MQTT клиент не инициализирован');
    }

    if (!this.mqttClient.isConnected()) {
      throw new Error('MQTT клиент не подключен к брокеру');
    }
  }

  /**
   * Отправляет команду устройству и ожидает ответ
   *
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - RPC метод для выполнения
   * @param params - Параметры метода
   * @param timeout - Таймаут ожидания ответа в миллисекундах
   * @returns Promise с ответом от устройства
   * @throws Error если сервис не готов или произошла ошибка
   */
  async sendDeviceCommand(
    userId: string,
    deviceId: string,
    method: string,
    params?: Record<string, unknown>,
    timeout = 5000
  ): Promise<RpcResponse> {
    await this.ensureReady();

    const startTime = Date.now();

    this.logger.info(
      {
        userId,
        deviceId,
        method,
        params,
        timeout,
      },
      'Отправка команды устройству'
    );

    try {
      // Проверяем, что клиент существует (уже проверено в ensureReady)
      if (!this.mqttClient) {
        throw new Error('MQTT клиент не инициализирован');
      }

      const response = await this.mqttClient.sendCommandWithResponse(
        userId,
        deviceId,
        method,
        params,
        timeout
      );

      const executionTime = Date.now() - startTime;

      this.logger.info(
        {
          userId,
          deviceId,
          method,
          executionTime,
          responseId: response.id,
          hasResult: Boolean(response.result),
          hasError: Boolean(response.error),
        },
        'Получен ответ от устройства'
      );

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        {
          userId,
          deviceId,
          method,
          executionTime,
          error: error instanceof Error ? error.message : String(error),
        },
        'Ошибка при отправке команды устройству'
      );

      throw error;
    }
  }

  /**
   * Отправляет команду устройству без ожидания ответа
   *
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - RPC метод для выполнения
   * @param params - Параметры метода
   */
  async sendDeviceCommandNoResponse(
    userId: string,
    deviceId: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    await this.ensureReady();

    this.logger.info(
      {
        userId,
        deviceId,
        method,
        params,
      },
      'Отправка команды устройству без ожидания ответа'
    );

    try {
      // Проверяем, что клиент существует (уже проверено в ensureReady)
      if (!this.mqttClient) {
        throw new Error('MQTT клиент не инициализирован');
      }

      this.mqttClient.sendCommand(userId, deviceId, method, params);

      this.logger.info(
        {
          userId,
          deviceId,
          method,
        },
        'Команда отправлена устройству'
      );
    } catch (error) {
      this.logger.error(
        {
          userId,
          deviceId,
          method,
          error: error instanceof Error ? error.message : String(error),
        },
        'Ошибка при отправке команды устройству'
      );

      throw error;
    }
  }

  /**
   * Проверяет статус подключения к MQTT брокеру
   *
   * @returns true если подключен, false если отключен
   */
  isConnected(): boolean {
    const connected = this.mqttClient?.isConnected() ?? false;

    this.logger.debug(
      {
        connected,
        isInitialized: this.isInitialized,
        hasClient: Boolean(this.mqttClient),
      },
      'Проверка статуса подключения MQTT'
    );

    return connected;
  }

  /**
   * Получает информацию о состоянии сервиса
   *
   * @returns Объект с информацией о состоянии
   */
  getStatus() {
    const mqttConfig = this.configService.getMqttConfig();
    const brokerUrl = this.configService.getMqttBrokerUrl();

    const status = {
      isInitialized: this.isInitialized,
      isConnected: this.isConnected(),
      brokerUrl,
      clientId: mqttConfig.clientId,
      qos: mqttConfig.qos,
      timestamp: new Date().toISOString(),
    };

    this.logger.debug(status, 'Получение статуса MQTT RPC сервиса');

    return status;
  }

  /**
   * Подписывается на все response topics с wildcard паттерном
   * Это позволяет backend получать ответы от всех устройств
   */
  private async subscribeToAllResponseTopics(): Promise<void> {
    if (!this.mqttClient) {
      this.logger.error('MQTT клиент не инициализирован');
      return;
    }

    try {
      // Подписываемся на все response topics: users/+/devices/+/rpc/response
      const wildcardTopic = 'users/+/devices/+/rpc/response';
      await this.mqttClient.subscribe(wildcardTopic, { qos: 1 });
      this.logger.info(`Подписка на wildcard response topic: ${wildcardTopic}`);

      // Обработчик сообщений уже настроен в MqttRpcClient
      this.mqttClient.on('message', (topic: string, payload: Buffer) => {
        if (topic.endsWith('/rpc/response')) {
          try {
            const message = JSON.parse(payload.toString());
            this.logger.debug(`Получен ответ с topic ${topic}:`, message);
          } catch (error) {
            this.logger.error(`Ошибка обработки response сообщения:`, error);
          }
        }
      });
    } catch (error) {
      this.logger.error('Ошибка подписки на wildcard topic:', error);
    }
  }

  /**
   * Получить статус MQTT соединения
   */
  async getConnectionStatus() {
    const config = this.configService.getMqttConfig();

    if (!this.mqttClient) {
      return {
        connected: false,
        brokerUrl: config.brokerUrl,
        clientId: config.clientId,
      };
    }

    return {
      connected: this.mqttClient.isConnected(),
      brokerUrl: config.brokerUrl,
      clientId: config.clientId,
      connectTime: this.mqttClient.getOptions?.()?.connectTimeout?.toString(),
      lastMessage: new Date().toISOString(),
    };
  }
}
