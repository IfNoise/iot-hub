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
 * Опции для MQTT Device клиента - ВСЕГДА использует mTLS
 */
export interface MqttDeviceClientOptions extends MqttConnectionOptions {
  /** Идентификатор пользователя */
  userId: string;
  /** Идентификатор устройства */
  deviceId: string;
  /** Фингерпринт сертификата для передачи как password */
  certificateFingerprint?: string;
  /** Полезная нагрузка для Last Will сообщения */
  willPayload?: string;
  /** mTLS сертификаты - ОБЯЗАТЕЛЬНО */
  certificates: {
    /** CA сертификат */
    ca: string | Buffer;
    /** Клиентский сертификат */
    cert: string | Buffer;
    /** Клиентский приватный ключ */
    key: string | Buffer;
    /** Passphrase для приватного ключа */
    passphrase?: string;
  };
  /** Порт для mTLS соединения (по умолчанию 8883) */
  securePort?: number;
  /** Имя сервера для проверки TLS */
  servername?: string;
  /** Очистить сессию при подключении */
  clean?: boolean;
}

/**
 * MQTT клиент специально для IoT устройств с обязательным mTLS
 * Использует ТОЛЬКО безопасное подключение с взаимной аутентификацией
 */
export class MqttDeviceClient extends BaseMqttClient {
  private client: MqttClient;
  private options: MqttDeviceClientOptions;
  private responseListeners: Map<string, (response: RpcResponse) => void> =
    new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: MqttDeviceClientOptions) {
    super(options);
    this.options = options;

    // Валидируем обязательные сертификаты
    if (
      !options.certificates?.ca ||
      !options.certificates?.cert ||
      !options.certificates?.key
    ) {
      throw new Error('mTLS certificates are required for device connections');
    }

    // Настраиваем ТОЛЬКО mTLS подключение
    const mqttOptions: IClientOptions & { passphrase?: string } = {
      // Используем deviceId как clientId для MQTT
      clientId: options.deviceId,

      // Используем deviceId как username для MQTT
      username: options.deviceId,

      // Фингерпринт сертификата как password для HTTP-аутентификации на EMQX
      password: options.certificateFingerprint,

      // Протокол и порт - ТОЛЬКО mTLS
      protocol: 'mqtts',
      port: options.securePort || 8883,

      // Базовые настройки подключения
      keepalive: options.keepalive ?? 60,
      clean: options.clean ?? true,
      reconnectPeriod: options.reconnectPeriod ?? TIMEOUTS.MQTT_RECONNECT,
      connectTimeout: options.connectTimeout ?? TIMEOUTS.MQTT_CONNECT,

      // mTLS сертификаты - ОБЯЗАТЕЛЬНО
      ca: options.certificates.ca,
      cert: options.certificates.cert,
      key: options.certificates.key,

      // Строгая проверка сертификатов
      rejectUnauthorized: true,

      // Имя сервера для проверки
      servername: options.servername,

      // Last Will для отслеживания отключения устройства
      will: options.willPayload
        ? {
            topic: `users/${options.userId}/devices/${options.deviceId}/status`,
            payload: options.willPayload,
            qos: options.qos ?? 1,
            retain: true,
          }
        : undefined,
    };

    // Добавляем passphrase если есть
    if (options.certificates.passphrase) {
      mqttOptions.passphrase = options.certificates.passphrase;
    }

    // Создаем безопасное подключение
    const brokerUrl = new URL(options.brokerUrl);
    brokerUrl.protocol = 'mqtts:';
    brokerUrl.port = (options.securePort || 8883).toString();

    this.client = mqtt.connect(brokerUrl.toString(), mqttOptions);

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
    this.client.on('connect', (connack) => {
      this.connectionState = 'connected';
      this.logger.log(
        `[MQTT Device] Connected to broker with mTLS - Device: ${this.options.deviceId}`
      );
      this.logger.log(
        `[MQTT Device] Session present: ${connack.sessionPresent}`
      );
      this.emit('connect');
    });

    this.client.on('reconnect', () => {
      this.connectionState = 'reconnecting';
      this.logger.log(
        `[MQTT Device] Reconnecting device ${this.options.deviceId}...`
      );
      this.emit('reconnect');
    });

    this.client.on('error', (error: Error) => {
      this.connectionState = 'error';
      this.logger.error(
        `[MQTT Device] Connection error for device ${this.options.deviceId}:`,
        error.message
      );
      this.emit('error', error);
    });

    this.client.on('close', () => {
      this.connectionState = 'disconnected';
      this.logger.warn(
        `[MQTT Device] Connection closed for device ${this.options.deviceId}`
      );
      this.emit('close');
    });

    this.client.on('offline', () => {
      this.connectionState = 'disconnected';
      this.logger.warn(`[MQTT Device] Device ${this.options.deviceId} offline`);
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
        this.logger.error(
          `[MQTT Device] Invalid message format for device ${this.options.deviceId}:`,
          error
        );
      }
    });
  }

  /**
   * Очищает устаревшие слушатели ответов
   */
  private cleanupStaleListeners(): void {
    if (this.responseListeners.size > 0) {
      this.logger.log(
        `[MQTT Device] Active response listeners for device ${this.options.deviceId}: ${this.responseListeners.size}`
      );
    }
  }

  /**
   * Подключиться к MQTT брокеру с mTLS
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      this.connectionState = 'connecting';

      const timeout = setTimeout(() => {
        reject(
          new Error(
            `mTLS connection timeout for device ${this.options.deviceId}`
          )
        );
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
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.responseListeners.clear();

    return new Promise((resolve) => {
      if (!this.client || this.connectionState === 'disconnected') {
        resolve();
        return;
      }

      this.connectionState = 'connecting'; // Меняем на connecting при начале отключения

      this.client.end(false, {}, () => {
        this.connectionState = 'disconnected';
        this.logger.log(
          `[MQTT Device] Disconnected device ${this.options.deviceId}`
        );
        resolve();
      });
    });
  }

  /**
   * Подписаться на топик
   */
  async subscribe(
    topic: string,
    options?: IClientSubscribeOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.subscribe(
        topic,
        options ?? { qos: this.options.qos ?? 1 },
        (error) => {
          if (error) {
            this.logger.error(
              `[MQTT Device] Subscription error for device ${this.options.deviceId}:`,
              error
            );
            reject(error);
          } else {
            this.logger.log(
              `[MQTT Device] Subscribed device ${this.options.deviceId} to topic: ${topic}`
            );
            resolve();
          }
        }
      );
    });
  }

  /**
   * Отписаться от топика
   */
  async unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          this.logger.error(
            `[MQTT Device] Unsubscription error for device ${this.options.deviceId}:`,
            error
          );
          reject(error);
        } else {
          this.logger.log(
            `[MQTT Device] Unsubscribed device ${this.options.deviceId} from topic: ${topic}`
          );
          resolve();
        }
      });
    });
  }

  /**
   * Опубликовать сообщение
   */
  async publish(
    topic: string,
    message: string | Buffer,
    options?: IClientPublishOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        message,
        options ?? { qos: this.options.qos ?? 1 },
        (error) => {
          if (error) {
            this.logger.error(
              `[MQTT Device] Publish error for device ${this.options.deviceId}:`,
              error
            );
            reject(error);
          } else {
            this.logger.log(
              `[MQTT Device] Published from device ${this.options.deviceId} to topic: ${topic}`
            );
            resolve();
          }
        }
      );
    });
  }

  /**
   * Отправить RPC запрос (специфично для устройств)
   */
  async sendRpcRequest(
    method: string,
    params: Record<string, unknown> = {},
    timeout: number = TIMEOUTS.RPC_DEFAULT
  ): Promise<RpcResponse> {
    const request = createRpcRequest(
      this.options.userId,
      this.options.deviceId,
      method,
      params
    );
    const requestTopic = request.topic;
    const responseTopic = getResponseTopic(
      this.options.userId,
      this.options.deviceId
    );

    // Подписываемся на ответ
    await this.subscribe(responseTopic);

    return new Promise((resolve, reject) => {
      // Устанавливаем таймаут
      const timeoutId = setTimeout(() => {
        this.responseListeners.delete(request.message.id);
        this.unsubscribe(responseTopic).catch(() => {
          // Игнорируем ошибки отписки
        });
        reject(
          new Error(`RPC request timeout for device ${this.options.deviceId}`)
        );
      }, timeout);

      // Добавляем слушатель ответа
      this.responseListeners.set(
        request.message.id,
        (response: RpcResponse) => {
          clearTimeout(timeoutId);
          this.responseListeners.delete(request.message.id);
          this.unsubscribe(responseTopic).catch(() => {
            // Игнорируем ошибки отписки
          });
          resolve(response);
        }
      );

      // Отправляем запрос
      this.publish(requestTopic, JSON.stringify(request.message)).catch(
        (error) => {
          clearTimeout(timeoutId);
          this.responseListeners.delete(request.message.id);
          this.unsubscribe(responseTopic).catch(() => {
            // Игнорируем ошибки отписки
          });
          reject(error);
        }
      );
    });
  }

  /**
   * Проверить состояние подключения
   */
  override isConnected(): boolean {
    return (
      this.connectionState === 'connected' && this.client?.connected === true
    );
  }

  /**
   * Получить статистику подключения
   */
  getConnectionStats() {
    return {
      deviceId: this.options.deviceId,
      userId: this.options.userId,
      connected: this.isConnected(),
      state: this.connectionState,
      activeListeners: this.responseListeners.size,
      connectionType: 'mTLS',
      securePort: this.options.securePort || 8883,
    };
  }
}
