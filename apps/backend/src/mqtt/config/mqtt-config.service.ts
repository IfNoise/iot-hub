import { Injectable } from '@nestjs/common';
import { mqttConfigSchema, MqttConfig } from './mqtt-config.schema';

@Injectable()
export class MqttConfigService {
  private readonly config: MqttConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = mqttConfigSchema.parse({
      brokerUrl: env.MQTT_BROKER_URL,
      host: env.MQTT_HOST,
      port: env.MQTT_PORT,
      securePort: env.MQTT_SECURE_PORT,
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      clientId: env.MQTT_CLIENT_ID,
      keepalive: env.MQTT_KEEPALIVE,
      clean: env.MQTT_CLEAN_SESSION,
      protocolVersion: 4, // Fixed version
      reconnectPeriod: env.MQTT_RECONNECT_PERIOD,
      connectTimeout: env.MQTT_CONNECT_TIMEOUT,
      rejectUnauthorized: true, // Fixed for security
      qos: env.MQTT_QOS,
      retain: env.MQTT_RETAIN,
      maxReconnectAttempts: env.MQTT_MAX_RECONNECT_ATTEMPTS,
      will: env.MQTT_WILL_TOPIC
        ? {
            topic: env.MQTT_WILL_TOPIC,
            payload: env.MQTT_WILL_PAYLOAD,
            qos: parseInt(env.MQTT_WILL_QOS || '0', 10),
            retain: env.MQTT_WILL_RETAIN === 'true',
          }
        : undefined,
      // TLS configuration for mTLS
      tls:
        env.MQTT_TLS_CA || env.MQTT_TLS_CERT || env.MQTT_TLS_KEY
          ? {
              ca: env.MQTT_TLS_CA,
              cert: env.MQTT_TLS_CERT,
              key: env.MQTT_TLS_KEY,
              passphrase: env.MQTT_TLS_PASSPHRASE,
              rejectUnauthorized: env.MQTT_TLS_REJECT_UNAUTHORIZED !== 'false',
              servername: env.MQTT_TLS_SERVERNAME,
              requestCert: env.MQTT_TLS_REQUEST_CERT === 'true',
              verifyClient: env.MQTT_TLS_VERIFY_CLIENT === 'true',
            }
          : undefined,
    });
  }

  get<T extends keyof MqttConfig>(key: T): MqttConfig[T] {
    return this.config[key];
  }

  getAll(): MqttConfig {
    return this.config;
  }

  // Convenience methods
  getBrokerUrl(): string {
    return this.config.brokerUrl;
  }

  getConnectionConfig() {
    return {
      host: this.config.host,
      port: this.config.port,
      securePort: this.config.securePort,
      username: this.config.username,
      password: this.config.password,
      clientId: this.config.clientId,
    };
  }

  getProtocolConfig() {
    return {
      keepalive: this.config.keepalive,
      clean: this.config.clean,
      protocolVersion: this.config.protocolVersion,
      reconnectPeriod: this.config.reconnectPeriod,
      connectTimeout: this.config.connectTimeout,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
    };
  }

  getQosConfig() {
    return {
      qos: this.config.qos,
      retain: this.config.retain,
    };
  }

  getWillConfig() {
    return this.config.will;
  }

  getTlsConfig() {
    return this.config.tls;
  }

  // Helper methods
  hasAuthentication(): boolean {
    return !!(this.config.username && this.config.password);
  }

  hasTls(): boolean {
    return !!this.config.tls;
  }

  hasWill(): boolean {
    return !!this.config.will;
  }

  // Get client options for MQTT library
  getClientOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {
      host: this.config.host,
      port: this.config.port,
      clientId: this.config.clientId,
      keepalive: this.config.keepalive,
      clean: this.config.clean,
      protocolVersion: this.config.protocolVersion,
      reconnectPeriod: this.config.reconnectPeriod,
      connectTimeout: this.config.connectTimeout,
      rejectUnauthorized: this.config.rejectUnauthorized,
    };

    if (this.hasAuthentication()) {
      options.username = this.config.username;
      options.password = this.config.password;
    }

    if (this.hasTls()) {
      options.protocol = 'mqtts';
      options.port = this.config.securePort;
      if (this.config.tls) {
        options.ca = this.config.tls.ca;
        options.cert = this.config.tls.cert;
        options.key = this.config.tls.key;
        options.passphrase = this.config.tls.passphrase;
        options.rejectUnauthorized = this.config.tls.rejectUnauthorized;
        options.servername = this.config.tls.servername;
        options.requestCert = this.config.tls.requestCert;
      }
    }

    if (this.hasWill()) {
      options.will = this.config.will;
    }

    return options;
  }

  // Get secure client options specifically for mTLS
  getSecureClientOptions(
    clientCert?: string,
    clientKey?: string,
    caCert?: string,
    passphrase?: string
  ): Record<string, unknown> {
    const options = this.getClientOptions();

    // Force secure connection
    options.protocol = 'mqtts';
    options.port = this.config.securePort;

    // Set up mTLS certificates
    if (caCert) {
      options.ca = caCert;
    }
    if (clientCert) {
      options.cert = clientCert;
    }
    if (clientKey) {
      options.key = clientKey;
    }
    if (passphrase) {
      options.passphrase = passphrase;
    }

    // Ensure proper mTLS verification
    options.rejectUnauthorized = true;
    options.requestCert = true;

    return options;
  }
}
