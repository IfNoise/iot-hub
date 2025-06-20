/**
 * Базовые типы для RPC механизма
 * Определяет структуры запросов, ответов и методов для MQTT и WebSocket RPC
 */

/**
 * Основная структура RPC запроса
 */
export interface RpcRequest {
  /** Уникальный идентификатор запроса */
  id: string;
  /** Идентификатор целевого устройства */
  deviceId: string;
  /** Название RPC метода для выполнения */
  method: string;
  /** Параметры для метода (опционально) */
  params?: Record<string, unknown>;
}

/**
 * Структура RPC ответа
 */
export interface RpcResponse {
  /** Идентификатор запроса (совпадает с RpcRequest.id) */
  id: string;
  /** Результат выполнения метода (при успехе) */
  result?: Record<string, unknown>;
  /** Информация об ошибке (при неудаче) */
  error?: {
    /** Код ошибки */
    code: number;
    /** Описание ошибки */
    message: string;
  };
}

/**
 * MQTT-специфичная структура RPC запроса с топиком
 */
export interface MqttRpcRequest {
  /** MQTT топик для отправки сообщения */
  topic: string;
  /** RPC сообщение */
  message: RpcRequest;
}

/**
 * Общие типы для устройств
 */
export interface DeviceInfo {
  id: string;
  model: string;
  firmwareVersion?: string;
  status: 'online' | 'offline' | 'error';
  lastSeen?: Date;
}

/**
 * Типы для пользователей
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
}

/**
 * Типы для подписок и планов
 */
export interface UserPlan {
  type: 'free' | 'pro' | 'enterprise';
  expiresAt?: Date;
  features: string[];
}

/**
 * Типы для сертификатов
 */
export interface CertificateInfo {
  id: string;
  fingerprint: string;
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  isValid: boolean;
}
