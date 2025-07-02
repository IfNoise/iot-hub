import mqtt, {
  MqttClient,
  IClientOptions,
  IClientPublishOptions,
  IClientSubscribeOptions,
} from 'mqtt';
import { BaseMqttClient, MqttConnectionOptions } from './base-client.js';
import { RpcResponse } from '../../types/index.js';
import { createRpcRequest, getResponseTopic } from '../../utils/index.js';
import { TIMEOUTS } from '../../constants/index.js';

/**
 * Опции для MQTT RPC клиента
 */
export interface MqttRpcClientOptions extends MqttConnectionOptions {
  /** Идентификатор пользователя */
  userId: string;
  /** Идентификатор устройства */
  deviceId: string;
  /** JWT токен для аутентификации */
  token?: string;
  /** Имя пользователя для подключения (по умолчанию 'jwt') */
  username?: string;
  /** Полезная нагрузка для Last Will сообщения */
  willPayload?: string;
  /** Использовать TLS/mTLS соединение */
  useTls?: boolean;
  /** Порт для защищенного соединения */
  securePort?: number;
  /** TLS настройки */
  tls?: {
    /** CA сертификат */
    ca?: string | Buffer;
    /** Клиентский сертификат */
    cert?: string | Buffer;
    /** Клиентский приватный ключ */
    key?: string | Buffer;
    /** Passphrase для приватного ключа */
    passphrase?: string;
    /** Проверять сертификат сервера */
    rejectUnauthorized?: boolean;
    /** Имя сервера для проверки */
    servername?: string;
  };
}

/**
 * Конкретная реализация MQTT RPC клиента
 * Наследует от BaseMqttClient и добавляет RPC функциональность
 */
export class MqttRpcClient extends BaseMqttClient {
  private client: MqttClient;
  private options: MqttRpcClientOptions;
  private responseListeners: Map<string, (response: RpcResponse) => void> =
    new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: MqttRpcClientOptions) {
    super(options);
    this.options = options;

    const mqttOptions: IClientOptions = {
      username: options.username ?? 'jwt',
      password: options.token,
      reconnectPeriod: options.reconnectPeriod ?? TIMEOUTS.MQTT_RECONNECT,
      connectTimeout: options.connectTimeout ?? TIMEOUTS.MQTT_CONNECT,
      keepalive: options.keepalive ?? 60,
      will: options.willPayload
        ? {
            topic: `users/${options.userId}/devices/${options.deviceId}/status`,
            payload: options.willPayload,
            qos: options.qos ?? 1,
            retain: true,
          }
        : undefined,
    }; // Настройка TLS/mTLS
    if (options.useTls && options.tls) {
      const tlsOptions: IClientOptions & { passphrase?: string } = {
        ...mqttOptions,
        ca: options.tls.ca,
        cert: options.tls.cert,
        key: options.tls.key,
        rejectUnauthorized: options.tls.rejectUnauthorized ?? false, // По умолчанию false для тестовой среды с самоподписанными сертификатами
        servername: options.tls.servername,
      };

      // Добавляем passphrase если он есть
      if (options.tls.passphrase) {
        tlsOptions.passphrase = options.tls.passphrase;
      }

      // Обновляем URL для безопасного соединения
      const url = new URL(options.brokerUrl);
      url.protocol = 'mqtts:';
      if (options.securePort) {
        url.port = options.securePort.toString();
      }
      this.client = mqtt.connect(url.toString(), tlsOptions);
    } else {
      this.client = mqtt.connect(options.brokerUrl, mqttOptions);
    }

    this.attachEventListeners();
    this.attachMessageHandler();

    // Очистка устаревших слушателей каждую минуту
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleListeners(),
      60000
    );
  }

  /**
   * Подключает обработчики событий MQTT
   */
  private attachEventListeners(): void {
    this.client.on('connect', () => {
      this.connectionState = 'connected';
      this.logger.log('[MQTT RPC] Connected to broker');
      this.emit('connect');
    });

    this.client.on('reconnect', () => {
      this.connectionState = 'reconnecting';
      this.logger.log('[MQTT RPC] Reconnecting...');
      this.emit('reconnect');
    });

    this.client.on('error', (error: Error) => {
      this.connectionState = 'error';
      this.logger.error('[MQTT RPC] Connection error:', error.message);
      this.emit('error', error);
    });

    this.client.on('close', () => {
      this.connectionState = 'disconnected';
      this.logger.warn('[MQTT RPC] Connection closed');
      this.emit('close');
    });

    this.client.on('offline', () => {
      this.connectionState = 'disconnected';
      this.logger.warn('[MQTT RPC] Client offline');
      this.emit('disconnect');
    });
  }

  /**
   * Подключает обработчик входящих сообщений
   */
  private attachMessageHandler(): void {
    this.client.on('message', (topic: string, payload: Buffer, packet) => {
      try {
        const message = JSON.parse(payload.toString()) as RpcResponse;

        // Вызываем общий обработчик сообщений
        this.emit('message', topic, payload, {
          topic,
          payload,
          qos: packet.qos,
          retain: packet.retain,
          duplicate: packet.dup,
        });

        // Обрабатываем RPC ответы
        const listener = this.responseListeners.get(message.id);
        if (listener) {
          listener(message);
        }
      } catch (error) {
        this.logger.error('[MQTT RPC] Invalid message format:', error);
      }
    });
  }

  /**
   * Очищает устаревшие слушатели ответов
   */
  private cleanupStaleListeners(): void {
    // В будущем можно добавить логику очистки по времени
    // Пока просто логируем количество активных слушателей
    if (this.responseListeners.size > 0) {
      this.logger.log(
        `[MQTT RPC] Active response listeners: ${this.responseListeners.size}`
      );
    }
  }

  /**
   * Подключиться к MQTT брокеру
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      this.connectionState = 'connecting';

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.options.connectTimeout ?? TIMEOUTS.MQTT_CONNECT);

      this.client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Отключиться от MQTT брокера
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Очищаем все слушатели ответов
      this.responseListeners.clear();

      this.client.end(false, {}, () => {
        this.connectionState = 'disconnected';
        this.logger.log('[MQTT RPC] Disconnected');
        resolve();
      });
    });
  }

  /**
   * Опубликовать сообщение
   */
  async publish(
    topic: string,
    payload: string | Buffer,
    options: IClientPublishOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const publishOptions: IClientPublishOptions = {
        qos: this.options.qos ?? 1,
        ...options,
      };

      this.client.publish(topic, payload, publishOptions, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Подписаться на топик
   */
  async subscribe(
    topic: string | string[],
    options: Partial<IClientSubscribeOptions> = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const subscribeOptions: IClientSubscribeOptions = {
        ...options,
        qos: options.qos ?? this.options.qos ?? 1,
      };

      this.client.subscribe(topic, subscribeOptions, (error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.log(
            `[MQTT RPC] Subscribed to: ${
              Array.isArray(topic) ? topic.join(', ') : topic
            }`
          );
          resolve();
        }
      });
    });
  }

  /**
   * Отписаться от топика
   */
  async unsubscribe(topic: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.log(
            `[MQTT RPC] Unsubscribed from: ${
              Array.isArray(topic) ? topic.join(', ') : topic
            }`
          );
          resolve();
        }
      });
    });
  }

  /**
   * Подписаться на топик ответов устройства
   */
  async subscribeToResponses(): Promise<void> {
    const topic = getResponseTopic(this.options.userId, this.options.deviceId);
    await this.subscribe(topic);
  }

  /**
   * Отправить RPC команду без ожидания ответа
   */
  async sendCommand(
    userId: string,
    deviceId: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const request = createRpcRequest(userId, deviceId, method, params);
    const payload = JSON.stringify(request.message);

    await this.publish(request.topic, payload);
    this.logger.log(`[MQTT RPC] Command sent: ${method}`, params);
  }

  /**
   * Отправить RPC команду с ожиданием ответа
   */
  async sendCommandWithResponse(
    userId: string,
    deviceId: string,
    method: string,
    params?: Record<string, unknown>,
    timeout: number = TIMEOUTS.RPC_DEFAULT
  ): Promise<RpcResponse> {
    const request = createRpcRequest(userId, deviceId, method, params);

    return new Promise((resolve, reject) => {
      // Устанавливаем таймаут
      const timer = setTimeout(() => {
        this.responseListeners.delete(request.message.id);
        this.logger.warn(`[MQTT RPC] Timeout for command: ${method}`);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeout);

      // Регистрируем слушатель ответа
      this.responseListeners.set(request.message.id, (response) => {
        clearTimeout(timer);
        this.responseListeners.delete(request.message.id);

        if (response.error) {
          reject(
            new Error(
              `RPC error: ${response.error.message} (code: ${response.error.code})`
            )
          );
        } else {
          resolve(response);
        }
      });

      // Отправляем команду
      this.publish(request.topic, JSON.stringify(request.message))
        .then(() => {
          this.logger.log(`[MQTT RPC] Command sent: ${method}`, params);
        })
        .catch((error) => {
          clearTimeout(timer);
          this.responseListeners.delete(request.message.id);
          this.logger.error(
            `[MQTT RPC] Failed to send command: ${method}`,
            error
          );
          reject(error);
        });
    });
  }
  /**
   * Получить опции клиента
   */
  getOptions(): IClientOptions {
    return this.options;
  }

  /**
   * Получить статистику клиента
   */
  getStats(): {
    connected: boolean;
    activeListeners: number;
    userId: string;
    deviceId: string;
  } {
    return {
      connected: this.isConnected(),
      activeListeners: this.responseListeners.size,
      userId: this.options.userId,
      deviceId: this.options.deviceId,
    };
  }
}
