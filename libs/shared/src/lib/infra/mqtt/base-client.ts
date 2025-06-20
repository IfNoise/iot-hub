/**
 * Базовый MQTT клиент для IoT Hub
 * Предоставляет общую функциональность для работы с MQTT
 */

/**
 * Интерфейс логгера
 */
export interface Logger {
  /** Логирование обычных сообщений */
  log: (...args: unknown[]) => void;
  /** Логирование предупреждений */
  warn: (...args: unknown[]) => void;
  /** Логирование ошибок */
  error: (...args: unknown[]) => void;
}

/**
 * Опции для подключения к MQTT
 */
export interface MqttConnectionOptions {
  /** URL MQTT брокера */
  brokerUrl: string;
  /** Имя пользователя */
  username?: string;
  /** Пароль или JWT токен */
  password?: string;
  /** Идентификатор клиента */
  clientId?: string;
  /** Уровень качества доставки по умолчанию */
  qos?: 0 | 1 | 2;
  /** Интервал переподключения в мс */
  reconnectPeriod?: number;
  /** Таймаут подключения в мс */
  connectTimeout?: number;
  /** Keep-alive интервал в секундах */
  keepalive?: number;
  /** Last Will опции */
  will?: {
    topic: string;
    payload: string;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  };
  /** Объект для логирования */
  logger?: Logger;
}

/**
 * Опции для публикации сообщений
 */
export interface PublishOptions {
  /** Уровень качества доставки */
  qos?: 0 | 1 | 2;
  /** Флаг retain */
  retain?: boolean;
  /** Дубликат сообщения */
  dup?: boolean;
}

/**
 * Опции для подписки на топики
 */
export interface SubscribeOptions {
  /** Уровень качества доставки */
  qos?: 0 | 1 | 2;
}

/**
 * Интерфейс для MQTT сообщения
 */
export interface MqttMessage {
  /** Топик сообщения */
  topic: string;
  /** Полезная нагрузка */
  payload: Buffer;
  /** QoS уровень */
  qos: 0 | 1 | 2;
  /** Флаг retain */
  retain: boolean;
  /** Флаг duplicate */
  duplicate: boolean;
}

/**
 * Состояние подключения MQTT клиента
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * События MQTT клиента
 */
export interface MqttClientEvents {
  /** Успешное подключение */
  connect: () => void;
  /** Отключение */
  disconnect: () => void;
  /** Ошибка подключения */
  error: (error: Error) => void;
  /** Получено сообщение */
  message: (topic: string, payload: Buffer, packet: MqttMessage) => void;
  /** Начало переподключения */
  reconnect: () => void;
  /** Закрытие соединения */
  close: () => void;
}

/**
 * Абстрактный базовый класс для MQTT клиентов
 */
export abstract class BaseMqttClient {
  protected connectionOptions: MqttConnectionOptions;
  protected logger: Logger;
  protected connectionState: ConnectionState = 'disconnected';
  protected eventListeners: Partial<MqttClientEvents> = {};

  constructor(options: MqttConnectionOptions) {
    this.connectionOptions = options;
    this.logger = options.logger || console;
  }

  /**
   * Получить текущее состояние подключения
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Проверить, подключен ли клиент
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Добавить обработчик события
   */
  on<K extends keyof MqttClientEvents>(
    event: K,
    listener: MqttClientEvents[K]
  ): void {
    this.eventListeners[event] = listener;
  }

  /**
   * Удалить обработчик события
   */
  off<K extends keyof MqttClientEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * Вызвать обработчик события
   */
  protected emit<K extends keyof MqttClientEvents>(
    event: K,
    ...args: Parameters<MqttClientEvents[K]>
  ): void {
    const listener = this.eventListeners[event];
    if (listener) {
      (listener as (...args: unknown[]) => void)(...args);
    }
  }

  /**
   * Подключиться к MQTT брокеру
   */
  abstract connect(): Promise<void>;

  /**
   * Отключиться от MQTT брокера
   */
  abstract disconnect(): Promise<void>;

  /**
   * Опубликовать сообщение
   */
  abstract publish(
    topic: string,
    payload: string | Buffer,
    options?: PublishOptions
  ): Promise<void>;

  /**
   * Подписаться на топик
   */
  abstract subscribe(
    topic: string | string[],
    options?: SubscribeOptions
  ): Promise<void>;

  /**
   * Отписаться от топика
   */
  abstract unsubscribe(topic: string | string[]): Promise<void>;
}
