/**
 * Константы для IoT Hub приложения
 */

/**
 * MQTT топики
 */
export const MQTT_TOPICS = {
  /** Базовый префикс для топиков пользователей */
  USERS_PREFIX: 'users',
  /** Базовый префикс для топиков устройств */
  DEVICES_PREFIX: 'devices',
  /** Суффикс для RPC запросов */
  RPC_REQUEST: 'rpc/request',
  /** Суффикс для RPC ответов */
  RPC_RESPONSE: 'rpc/response',
  /** Суффикс для телеметрии */
  TELEMETRY: 'telemetry',
  /** Суффикс для атрибутов */
  ATTRIBUTES: 'attributes',
} as const;

/**
 * Коды ошибок RPC
 */
export const RPC_ERROR_CODES = {
  /** Неизвестный метод */
  UNKNOWN_METHOD: -32601,
  /** Неверные параметры */
  INVALID_PARAMS: -32602,
  /** Внутренняя ошибка */
  INTERNAL_ERROR: -32603,
  /** Таймаут */
  TIMEOUT: -32000,
  /** Устройство недоступно */
  DEVICE_UNAVAILABLE: -32001,
  /** Ошибка выполнения */
  EXECUTION_ERROR: -32002,
} as const;

/**
 * Таймауты (в миллисекундах)
 */
export const TIMEOUTS = {
  /** Таймаут RPC запроса по умолчанию */
  RPC_DEFAULT: 5000,
  /** Максимальный таймаут RPC запроса */
  RPC_MAX: 30000,
  /** Таймаут подключения к MQTT */
  MQTT_CONNECT: 10000,
  /** Таймаут переподключения к MQTT */
  MQTT_RECONNECT: 5000,
} as const;

/**
 * Роли пользователей
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

/**
 * Планы подписки
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

/**
 * Статусы устройств
 */
export const DEVICE_STATUS = {
  UNBOUND: 'unbound',
  BOUND: 'bound',
  REVOKED: 'revoked',
  ONLINE: 'online',
  OFFLINE: 'offline',
  ERROR: 'error',
} as const;

/**
 * Статусы сертификатов
 */
export const CERTIFICATE_STATUS = {
  VALID: 'valid',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  PENDING: 'pending',
} as const;

/**
 * Паттерны валидации
 */
export const VALIDATION_PATTERNS = {
  /** UUID v4 */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /** Email */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Device ID */
  DEVICE_ID: /^[a-zA-Z0-9_-]{1,64}$/,
  /** Topic */
  MQTT_TOPIC: /^[a-zA-Z0-9_\-/]+$/,
} as const;

/**
 * Лимиты
 */
export const LIMITS = {
  /** Максимальное количество устройств на пользователя */
  MAX_DEVICES_PER_USER: 100,
  /** Максимальная длина имени устройства */
  DEVICE_NAME_MAX_LENGTH: 100,
  /** Максимальная длина топика MQTT */
  MQTT_TOPIC_MAX_LENGTH: 256,
  /** Максимальный размер RPC payload */
  RPC_PAYLOAD_MAX_SIZE: 1024 * 10, // 10KB
} as const;
