import { z } from 'zod';

// ===== IO SCHEMAS =====

/**
 * Схема дискретного входа
 */
export const DiscreteInputSchema = z
  .object({
    id: z.string().describe('Уникальный ID входа'),
    name: z.string().describe('Название входа'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    state: z.boolean().describe('Состояние входа'),
  })
  .strict();

/**
 * Схема аналогового входа
 */
export const AnalogInputSchema = z
  .object({
    id: z.string().describe('Уникальный ID входа'),
    name: z.string().describe('Название входа'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    value: z.number().describe('Значение входа'),
    scale: z.number().describe('Масштаб/коэффициент'),
  })
  .strict();

/**
 * Схема дискретного выхода
 */
export const DiscreteOutputSchema = z
  .object({
    id: z.string().describe('Уникальный ID выхода'),
    name: z.string().describe('Название выхода'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    state: z.boolean().describe('Состояние выхода'),
  })
  .strict();

/**
 * Схема аналогового выхода
 */
export const AnalogOutputSchema = z
  .object({
    id: z.string().describe('Уникальный ID выхода'),
    name: z.string().describe('Название выхода'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    value: z.number().describe('Значение выхода'),
    scale: z.number().describe('Масштаб/коэффициент'),
  })
  .strict();

// ===== SENSOR SCHEMAS =====

/**
 * Схема сенсора
 */
export const SensorSchema = z
  .object({
    id: z.string().describe('Уникальный ID сенсора'),
    name: z.string().describe('Название сенсора'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    value: z.number().describe('Текущее значение'),
    scale: z.number().describe('Масштаб/коэффициент'),
    units: z.string().describe('Единицы измерения'),
  })
  .strict();

// ===== TIMER SCHEMAS =====

/**
 * Схема дискретного таймера
 */
export const DiscreteTimerSchema = z
  .object({
    id: z.string().describe('Уникальный ID таймера'),
    name: z.string().describe('Название таймера'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    output: z.string().describe('ID выходного пина'),
    onTime: z.number().min(0).describe('Время включения (секунды)'),
    offTime: z.number().min(0).describe('Время выключения (секунды)'),
    isRunning: z.boolean().describe('Статус работы таймера'),
    currentState: z.boolean().describe('Текущее состояние выхода'),
  })
  .strict();

/**
 * Схема аналогового таймера
 */
export const AnalogTimerSchema = z
  .object({
    id: z.string().describe('Уникальный ID таймера'),
    name: z.string().describe('Название таймера'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    output: z.string().describe('ID выходного пина'),
    onValue: z.number().describe('Значение во время включения'),
    offValue: z.number().describe('Значение во время выключения'),
    onTime: z.number().min(0).describe('Время включения (секунды)'),
    offTime: z.number().min(0).describe('Время выключения (секунды)'),
    isRunning: z.boolean().describe('Статус работы таймера'),
    currentValue: z.number().describe('Текущее значение выхода'),
  })
  .strict();

// ===== REGULATOR SCHEMAS =====

/**
 * Схема дискретного регулятора
 */
export const DiscreteRegulatorSchema = z
  .object({
    id: z.string().describe('Уникальный ID регулятора'),
    name: z.string().describe('Название регулятора'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    sensor: z.string().describe('ID сенсора'),
    output: z.string().describe('ID выходного пина'),
    targetValue: z.number().describe('Целевое значение'),
    hysteresis: z.number().min(0).describe('Гистерезис'),
    isReverse: z.boolean().default(false).describe('Инверсия логики'),
    currentState: z.boolean().describe('Текущее состояние выхода'),
  })
  .strict();

/**
 * Схема аналогового регулятора
 */
export const AnalogRegulatorSchema = z
  .object({
    id: z.string().describe('Уникальный ID регулятора'),
    name: z.string().describe('Название регулятора'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    sensor: z.string().describe('ID сенсора'),
    output: z.string().describe('ID выходного пина'),
    targetValue: z.number().describe('Целевое значение'),
    kp: z.number().describe('Пропорциональный коэффициент'),
    ki: z.number().describe('Интегральный коэффициент'),
    kd: z.number().describe('Дифференциальный коэффициент'),
    currentValue: z.number().describe('Текущее значение выхода'),
  })
  .strict();

// ===== IRRIGATOR SCHEMAS =====

/**
 * Схема ирригатора
 */
export const IrrigatorSchema = z
  .object({
    id: z.string().describe('Уникальный ID ирригатора'),
    name: z.string().describe('Название ирригатора'),
    enabled: z.boolean().default(true).describe('Статус активации'),
    sensor: z.string().describe('ID сенсора влажности'),
    output: z.string().describe('ID выходного пина'),
    targetMoisture: z
      .number()
      .min(0)
      .max(100)
      .describe('Целевая влажность (%)'),
    duration: z.number().min(0).describe('Длительность полива (секунды)'),
    cooldownTime: z
      .number()
      .min(0)
      .describe('Время отдыха между поливами (секунды)'),
    isWatering: z.boolean().describe('Статус полива'),
    lastWateringAt: z
      .preprocess((v) => (v ? new Date(v as string) : null), z.date())
      .nullable()
      .describe('Время последнего полива'),
  })
  .strict();

// ===== DEVICE SCHEMAS =====

/**
 * Схемы объединений компонентов устройства
 */
export const TimerSchema = z.union([DiscreteTimerSchema, AnalogTimerSchema]);
export const RegulatorSchema = z.union([
  DiscreteRegulatorSchema,
  AnalogRegulatorSchema,
]);
export const InputSchema = z.union([DiscreteInputSchema, AnalogInputSchema]);
export const OutputSchema = z.union([DiscreteOutputSchema, AnalogOutputSchema]);

/**
 * Схема внутреннего состояния устройства
 */
export const DeviceInternalStateSchema = z
  .object({
    timers: z.array(TimerSchema).describe('Список таймеров устройства'),
    regulators: z
      .array(RegulatorSchema)
      .describe('Список регуляторов устройства'),
    irrigators: z
      .array(IrrigatorSchema)
      .describe('Список ирригаторов устройства'),
    sensors: z.array(SensorSchema).describe('Список сенсоров устройства'),
    inputs: z.array(InputSchema).describe('Список входов устройства'),
    outputs: z.array(OutputSchema).describe('Список выходов устройства'),
  })
  .strict();

/**
 * Базовая схема устройства
 * Унифицированная схема для всех операций с устройствами
 */
export const DeviceSchema = z
  .object({
    deviceId: z.string().describe('Уникальный ID устройства'),
    model: z.string().default('').describe('Модель устройства'),
    publicKeyPem: z.string().describe('Публичный ключ устройства в формате PEM'),
    ownerId: z.string().uuid().nullable().describe('ID владельца устройства'),
    status: z
      .enum(['unbound', 'bound', 'revoked'])
      .default('unbound')
      .describe('Статус привязки устройства'),
    lastSeenAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время последней активности'),
    firmwareVersion: z.string().optional().describe('Версия прошивки'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время создания'),
    boundAt: z
      .preprocess((v) => (v ? new Date(v as string) : null), z.date())
      .nullable()
      .describe('Время привязки устройства'),
    bindingTokenExpiresAt: z
      .preprocess((v) => (v ? new Date(v as string) : null), z.date())
      .nullable()
      .describe('Время истечения токена привязки'),
  })
  .strict();

/**
 * Схема сертификата устройства
 */
export const CertificateSchema = z
  .object({
    id: z.string().uuid().describe('ID сертификата'),
    clientCert: z.string().describe('Клиентский сертификат'),
    caCert: z.string().describe('Корневой CA сертификат'),
    fingerprint: z.string().describe('Отпечаток сертификата'),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .describe('Время создания'),
  })
  .strict();

// ===== UPDATE SCHEMAS =====

/**
 * DTO: Обновление дискретного таймера
 */
export const UpdateDiscreteTimerSchema = z
  .object({
    name: z.string().optional().describe('Название таймера'),
    enabled: z.boolean().optional().describe('Статус активации'),
    output: z.string().optional().describe('ID выходного пина'),
    onTime: z.number().min(0).optional().describe('Время включения (секунды)'),
    offTime: z
      .number()
      .min(0)
      .optional()
      .describe('Время выключения (секунды)'),
  })
  .strict();

/**
 * DTO: Обновление аналогового таймера
 */
export const UpdateAnalogTimerSchema = z
  .object({
    name: z.string().optional().describe('Название таймера'),
    enabled: z.boolean().optional().describe('Статус активации'),
    output: z.string().optional().describe('ID выходного пина'),
    onValue: z.number().optional().describe('Значение во время включения'),
    offValue: z.number().optional().describe('Значение во время выключения'),
    onTime: z.number().min(0).optional().describe('Время включения (секунды)'),
    offTime: z
      .number()
      .min(0)
      .optional()
      .describe('Время выключения (секунды)'),
  })
  .strict();

/**
 * DTO: Обновление дискретного регулятора
 */
export const UpdateDiscreteRegulatorSchema = z
  .object({
    name: z.string().optional().describe('Название регулятора'),
    enabled: z.boolean().optional().describe('Статус активации'),
    sensor: z.string().optional().describe('ID сенсора'),
    output: z.string().optional().describe('ID выходного пина'),
    targetValue: z.number().optional().describe('Целевое значение'),
    hysteresis: z.number().min(0).optional().describe('Гистерезис'),
    isReverse: z.boolean().optional().describe('Инверсия логики'),
  })
  .strict();

/**
 * DTO: Обновление аналогового регулятора
 */
export const UpdateAnalogRegulatorSchema = z
  .object({
    name: z.string().optional().describe('Название регулятора'),
    enabled: z.boolean().optional().describe('Статус активации'),
    sensor: z.string().optional().describe('ID сенсора'),
    output: z.string().optional().describe('ID выходного пина'),
    targetValue: z.number().optional().describe('Целевое значение'),
    kp: z.number().optional().describe('Пропорциональный коэффициент'),
    ki: z.number().optional().describe('Интегральный коэффициент'),
    kd: z.number().optional().describe('Дифференциальный коэффициент'),
  })
  .strict();

/**
 * DTO: Обновление ирригатора
 */
export const UpdateIrrigatorSchema = z
  .object({
    name: z.string().optional().describe('Название ирригатора'),
    enabled: z.boolean().optional().describe('Статус активации'),
    sensor: z.string().optional().describe('ID сенсора влажности'),
    output: z.string().optional().describe('ID выходного пина'),
    targetMoisture: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Целевая влажность (%)'),
    duration: z
      .number()
      .min(0)
      .optional()
      .describe('Длительность полива (секунды)'),
    cooldownTime: z
      .number()
      .min(0)
      .optional()
      .describe('Время отдыха между поливами (секунды)'),
  })
  .strict();

// ===== CREATE/UPDATE DEVICE SCHEMAS =====

/**
 * DTO: Create Device - Производственная схема для создания устройства
 * Унифицированная схема для всех процессов создания устройств
 */
export const CreateDeviceSchema = z
  .object({
    deviceId: z.string().describe('Уникальный ID устройства'),
    publicKeyPem: z
      .string()
      .describe('Публичный ключ устройства в формате PEM'),
    model: z.string().default('').describe('Модель устройства'),
    firmwareVersion: z
      .string()
      .optional()
      .describe('Версия прошивки устройства'),
  })
  .strict();

/**
 * Схема для привязки устройства
 *
 * ВАЖНО: userId (ownerId) НЕ передается в теле запроса!
 * userId извлекается из JWT токена через middleware аутентификации
 * в контроллере с помощью декоратора @CurrentUser()
 */
export const BindDeviceSchema = z
  .object({
    deviceId: z.string().describe('Уникальный ID устройства'),
    // Примечание: ownerId (userId) получается из JWT токена через middleware аутентификации
    // и НЕ передается в теле запроса
  })
  .strict();

/**
 * DTO: Query параметры для поиска устройств
 */
export const DeviceQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1).default(1))
    .describe('Номер страницы'),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(z.number().min(1).max(100).default(10))
    .describe('Количество элементов на странице'),
  status: z
    .enum(['unbound', 'bound', 'revoked'])
    .optional()
    .describe('Фильтр по статусу'),
  ownerId: z.string().uuid().optional().describe('Фильтр по владельцу'),
  model: z.string().optional().describe('Фильтр по модели'),
});

/**
 * Схема ответа со списком устройств
 */
export const DevicesListResponseSchema = z.object({
  devices: z.array(DeviceSchema).describe('Список устройств'),
  total: z.number().describe('Общее количество устройств'),
  page: z.number().describe('Текущая страница'),
  limit: z.number().describe('Количество элементов на странице'),
  totalPages: z.number().describe('Общее количество страниц'),
});

// ===== TYPES =====

export type Device = z.infer<typeof DeviceSchema>;
export type DeviceInternalState = z.infer<typeof DeviceInternalStateSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type CreateDevice = z.infer<typeof CreateDeviceSchema>;
export type BindDevice = z.infer<typeof BindDeviceSchema>;
export type DeviceQuery = z.infer<typeof DeviceQuerySchema>;
export type DevicesListResponse = z.infer<typeof DevicesListResponseSchema>;

// Component types
export type Sensor = z.infer<typeof SensorSchema>;
export type DiscreteTimer = z.infer<typeof DiscreteTimerSchema>;
export type AnalogTimer = z.infer<typeof AnalogTimerSchema>;
export type Timer = z.infer<typeof TimerSchema>;
export type DiscreteRegulator = z.infer<typeof DiscreteRegulatorSchema>;
export type AnalogRegulator = z.infer<typeof AnalogRegulatorSchema>;
export type Regulator = z.infer<typeof RegulatorSchema>;
export type Irrigator = z.infer<typeof IrrigatorSchema>;
export type DiscreteInput = z.infer<typeof DiscreteInputSchema>;
export type AnalogInput = z.infer<typeof AnalogInputSchema>;
export type Input = z.infer<typeof InputSchema>;
export type DiscreteOutput = z.infer<typeof DiscreteOutputSchema>;
export type AnalogOutput = z.infer<typeof AnalogOutputSchema>;
export type Output = z.infer<typeof OutputSchema>;

// Update types
export type UpdateDiscreteTimer = z.infer<typeof UpdateDiscreteTimerSchema>;
export type UpdateAnalogTimer = z.infer<typeof UpdateAnalogTimerSchema>;
export type UpdateDiscreteRegulator = z.infer<
  typeof UpdateDiscreteRegulatorSchema
>;
export type UpdateAnalogRegulator = z.infer<typeof UpdateAnalogRegulatorSchema>;
export type UpdateIrrigator = z.infer<typeof UpdateIrrigatorSchema>;

// ===== ALIASES FOR BACKWARD COMPATIBILITY =====
// Алиасы для обратной совместимости с device-base-schemas.ts

/**
 * @deprecated Используйте DeviceSchema вместо DeviceBaseSchema
 */
export const DeviceBaseSchema = DeviceSchema;

/**
 * @deprecated Используйте CertificateSchema вместо CertificateBaseSchema
 */
export const CertificateBaseSchema = CertificateSchema;

/**
 * @deprecated Используйте CreateDeviceSchema вместо CreateDeviceBaseSchema
 */
export const CreateDeviceBaseSchema = CreateDeviceSchema;

/**
 * @deprecated Используйте BindDeviceSchema вместо BindDeviceBaseSchema
 */
export const BindDeviceBaseSchema = BindDeviceSchema;

// Типы для обратной совместимости
export type DeviceBase = Device;
export type CertificateBase = Certificate;
export type CreateDeviceBase = CreateDevice;
export type BindDeviceBase = BindDevice;

// ===== ADDITIONAL SCHEMAS =====

/**
 * Схема для ответа после успешной привязки устройства (QR)
 */
export const BindDeviceResponseSchema = z.object({
  deviceId: z.string().describe('ID привязанного устройства'),
  userId: z.string().uuid().describe('ID владельца'),
  boundAt: z
    .preprocess((v) => new Date(v as string), z.date())
    .describe('Время привязки'),
  status: z.literal('bound').describe('Статус устройства'),
});

/**
 * Схема для запроса отвязки устройства
 */
export const UnbindDeviceRequestSchema = z.object({
  deviceId: z.string().describe('ID устройства для отвязки'),
  reason: z.string().optional().describe('Причина отвязки'),
});

/**
 * Схема списка устройств пользователя (расширенная для QR-флоу)
 */
export const UserDevicesResponseSchema = z.object({
  devices: z.array(
    z.object({
      deviceId: z.string(),
      model: z.string().optional(),
      status: z.enum(['bound', 'suspended']),
      boundAt: z.preprocess((v) => new Date(v as string), z.date()),
      lastSeenAt: z
        .preprocess((v) => (v ? new Date(v as string) : null), z.date())
        .nullable(),
    })
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/**
 * Унифицированная схема для административного управления устройствами
 * (расширяет DeviceSchema для поддержки QR-флоу)
 */
export const AdminDeviceSchema = z.object({
  deviceId: z.string(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  status: z.enum(['manufactured', 'unbound', 'bound', 'suspended', 'revoked']),
  ownerId: z.string().uuid().nullable(),
  createdAt: z.preprocess((v) => new Date(v as string), z.date()),
  boundAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable(),
  lastSeenAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable(),
  bindingTokenExpiresAt: z
    .preprocess((v) => (v ? new Date(v as string) : null), z.date())
    .nullable()
    .optional()
    .describe('Время истечения токена (null для бессрочных токенов)'),
});
