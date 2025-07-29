/**
 * Kafka топики для event-driven архитектуры
 */

export const KafkaTopics = {
  // Device Commands
  DeviceCommands: 'device.commands.v1',
  DeviceCommandResponses: 'device.commands.responses.v1',

  // Device Events
  DeviceEvents: 'device.events.v1',
  DeviceTelemetry: 'device.telemetry.v1',
  DeviceAlerts: 'device.alerts.v1',

  // User Events
  UserEvents: 'user.events.v1',
  UserCommands: 'user.commands.v1',

  // Auth Events
  AuthEvents: 'auth.events.v1',

  // Organization Events
  OrganizationEvents: 'organization.events.v1',

  // Certificate Events
  CertificateEvents: 'certificate.events.v1',
  CertificateCommands: 'certificate.commands.v1',

  // Integration Events
  MqttEvents: 'mqtt.events.v1',
  RestApiEvents: 'rest.events.v1',

  // System Events
  SystemEvents: 'system.events.v1',
  SystemCommands: 'system.commands.v1',
} as const;

export type KafkaTopicName = (typeof KafkaTopics)[keyof typeof KafkaTopics];

/**
 * Группы консьюмеров
 */
export const ConsumerGroups = {
  DeviceService: 'device-service',
  UserService: 'user-service',
  AuthService: 'auth-service',
  OrganizationService: 'organization-service',
  CertificateService: 'certificate-service',
  NotificationService: 'notification-service',
  MqttGateway: 'mqtt-gateway',
  WebApiGateway: 'web-api-gateway',
  TelemetryProcessor: 'telemetry-processor',
  AlertProcessor: 'alert-processor',
} as const;

export type ConsumerGroupName =
  (typeof ConsumerGroups)[keyof typeof ConsumerGroups];
