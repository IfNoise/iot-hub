import mqtt from 'mqtt';
import type {
  MqttRpcRequest,
  RpcMethod,
  RpcMethodParams,
  RpcResponse,
} from '../../types/rpc.types';
import {
  createValidatedRpcRequest,
  getResponseTopic,
} from '../../utils/rpc.utils';

/**
 * Интерфейс логгера для вывода сообщений
 */
type Logger = {
  /** Логирование обычных сообщений */
  log: (...args: any[]) => any;
  /** Логирование предупреждений */
  warn: (...args: any[]) => any;
  /** Логирование ошибок */
  error: (...args: any[]) => any;
};

type MqttClient = ReturnType<typeof mqtt.connect>;
type MqttOptions = Parameters<typeof mqtt.connect>[1];
type IClientPublishOptions = Parameters<MqttClient['publish']>[2];
type IClientSubscribeOptions = Parameters<MqttClient['subscribe']>[1];

/**
 * Опции для создания MQTT RPC клиента
 */
type MqttRpcClientOptions = {
  /** URL MQTT брокера */
  brokerUrl: string;
  /** Идентификатор пользователя */
  userId: string;
  /** Идентификатор устройства */
  deviceId: string;
  /** JWT токен для аутентификации */
  token?: string;
  /** Имя пользователя для подключения (по умолчанию 'jwt') */
  username?: string;
  /** Уровень качества доставки сообщений (0, 1, 2) */
  qos?: 0 | 1 | 2;
  /** Полезная нагрузка для Last Will сообщения */
  willPayload?: string;
  /** Объект для логирования событий */
  logger?: Logger;
};

/**
 * MQTT RPC клиент для отправки команд устройствам и получения ответов
 *
 * @example
 * ```typescript
 * const client = new MqttRpcClient({
 *   brokerUrl: 'mqtt://localhost:1883',
 *   userId: 'user123',
 *   deviceId: 'device456',
 *   token: 'jwt-token',
 *   qos: 1,
 *   logger: console
 * });
 *
 * client.onConnect(() => {
 *   console.log('Connected');
 *   client.onResponseTopic();
 * });
 *
 * const response = await client.sendCommandAsync('user1', 'dev1', 'getDeviceState', {});
 * ```
 */
export class MqttRpcClient {
  private client: MqttClient;
  private options: MqttRpcClientOptions;
  private responseListeners: Map<string, (response: RpcResponse) => void> =
    new Map();
  private cleanupInterval: NodeJS.Timeout;

  /**
   * Создает новый экземпляр MQTT RPC клиента
   * @param options - Опции конфигурации клиента
   */
  constructor(options: MqttRpcClientOptions) {
    this.options = options;

    const mqttOptions: MqttOptions = {
      username: options.username ?? 'jwt',
      password: options.token,
      reconnectPeriod: 2000,
      will: options.willPayload
        ? {
            topic: `users/${options.userId}/devices/${options.deviceId}/status`,
            payload: options.willPayload,
            qos: options.qos ?? 1,
            retain: true,
          }
        : undefined,
    };

    this.client = mqtt.connect(options.brokerUrl, mqttOptions);

    this.attachDefaultListeners();
    this.attachMessageHandler();

    this.cleanupInterval = setInterval(
      () => this.cleanupStaleListeners(),
      60000
    );
  }

  /**
   * Логирует обычные сообщения
   * @param args - Аргументы для логирования
   */
  private log(...args: any[]) {
    this.options.logger?.log?.(...args);
  }

  /**
   * Логирует предупреждения
   * @param args - Аргументы для логирования
   */
  private warn(...args: any[]) {
    this.options.logger?.warn?.(...args);
  }

  /**
   * Логирует ошибки
   * @param args - Аргументы для логирования
   */
  private error(...args: any[]) {
    this.options.logger?.error?.(...args);
  }

  /**
   * Подключает обработчики событий MQTT клиента
   */
  private attachDefaultListeners() {
    this.client.on('connect', () => {
      this.log('[MQTT] Connected');
    });
    this.client.on('reconnect', () => {
      this.log('[MQTT] Reconnecting...');
    });
    this.client.on('error', (err: Error) => {
      this.error('[MQTT] Error:', err.message);
    });
    this.client.on('close', () => {
      this.warn('[MQTT] Connection closed');
    });
    this.client.on('offline', () => {
      this.warn('[MQTT] Offline');
    });
  }

  /**
   * Подключает обработчик входящих сообщений
   */
  private attachMessageHandler() {
    this.client.on('message', (topic: string, message: Buffer) => {
      try {
        const parsed = JSON.parse(message.toString()) as RpcResponse;
        const cb = this.responseListeners.get(parsed.id);
        if (cb) cb(parsed);
      } catch (e) {
        this.error('[MQTT] Invalid RPC response:', e);
      }
    });
  }

  /**
   * Очищает устаревшие слушатели ответов
   */
  private cleanupStaleListeners(): void {
    // Расширяемая логика очистки старых callback'ов (например, через Map<string, { timestamp, cb }>)
  }

  /**
   * Устанавливает обработчик события подключения
   * @param callback - Функция, вызываемая при подключении
   */
  onConnect(callback: () => void): void {
    this.client.on('connect', callback);
  }

  /**
   * Подписывается на топик ответов устройства
   */
  onResponseTopic(): void {
    const topic = getResponseTopic(this.options.userId, this.options.deviceId);
    const subscribeOptions: IClientSubscribeOptions = {
      qos: this.options.qos ?? 1,
    };

    this.client.subscribe(topic, subscribeOptions, (err: Error | null) => {
      if (err) {
        this.error('[MQTT] Subscribe error:', err.message);
      } else {
        this.log(`[MQTT] Subscribed to response topic: ${topic}`);
      }
    });
  }

  /**
   * Отправляет команду устройству без ожидания ответа
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - Метод RPC
   * @param params - Параметры метода
   */
  sendCommand(
    userId: string,
    deviceId: string,
    method: RpcMethod,
    params?: RpcMethodParams
  ): void {
    const request: MqttRpcRequest = createValidatedRpcRequest(
      userId,
      deviceId,
      method,
      params
    );
    const payload = JSON.stringify(request.message);

    if (!this.client.connected) {
      this.warn('[MQTT] Not connected, cannot send command.');
      return;
    }

    const publishOptions: IClientPublishOptions = {
      qos: this.options.qos ?? 1,
    };

    this.client.publish(request.topic, payload, publishOptions, (err) => {
      if (err) {
        this.error('[MQTT] Failed to publish:', err.message);
      }
    });
  }

  /**
   * Отправляет команду устройству и ожидает ответ
   * @param userId - Идентификатор пользователя
   * @param deviceId - Идентификатор устройства
   * @param method - Метод RPC
   * @param params - Параметры метода
   * @param timeout - Таймаут ожидания ответа в миллисекундах (по умолчанию 5000)
   * @returns Promise с ответом устройства
   * @throws Error при таймауте или ошибке отправки
   */
  async sendCommandAsync(
    userId: string,
    deviceId: string,
    method: RpcMethod,
    params?: RpcMethodParams,
    timeout = 5000
  ): Promise<RpcResponse> {
    const response = createValidatedRpcRequest(
      userId,
      deviceId,
      method,
      params
    );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.responseListeners.delete(response.message.id);
        this.warn('[MQTT] RPC timeout for command:', method);
        reject(new Error('RPC timeout'));
      }, timeout);

      this.responseListeners.set(response.message.id, (resp) => {
        clearTimeout(timer);
        this.responseListeners.delete(response.message.id);
        resolve(resp);
      });

      this.client.publish(
        response.topic,
        JSON.stringify(response.message),
        { qos: this.options.qos ?? 1 },
        (err) => {
          if (err) {
            this.error('[MQTT] Failed to publish command:', err.message);
            this.responseListeners.delete(response.message.id);
            reject(err);
          } else {
            this.log('[MQTT] Command sent:', method, params);
          }
        }
      );
    });
  }

  /**
   * Проверяет статус подключения к MQTT брокеру
   * @returns true если подключен, false если отключен
   */
  isConnected(): boolean {
    return this.client.connected;
  }

  /**
   * Отключается от MQTT брокера
   * @param force - Принудительное отключение без ожидания
   */
  disconnect(force = false): void {
    clearInterval(this.cleanupInterval);
    this.client.end(force, {}, () => {
      this.log('[MQTT] Disconnected');
    });
  }
}
