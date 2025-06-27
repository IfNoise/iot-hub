import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

export interface MtlsConfig {
  useTls: boolean;
  brokerHost: string;
  mqttPort: number;
  mqttSecurePort: number;
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  servername?: string;
  rejectUnauthorized: boolean;
}

/**
 * Сервис для конфигурации mTLS подключения устройства
 */
@Injectable()
export class MtlsConfigService {
  private readonly logger = new Logger(MtlsConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Получает конфигурацию mTLS из переменных окружения
   */
  getMtlsConfig(): MtlsConfig {
    const useTls = this.configService.get<string>('USE_TLS') === 'true';

    return {
      useTls,
      brokerHost: this.configService.get<string>('MQTT_HOST') || 'localhost',
      mqttPort: parseInt(
        this.configService.get<string>('MQTT_PORT') || '1883',
        10
      ),
      mqttSecurePort: parseInt(
        this.configService.get<string>('MQTT_SECURE_PORT') || '8883',
        10
      ),
      caCertPath: this.configService.get<string>('CA_CERT_PATH'),
      clientCertPath: this.configService.get<string>('CLIENT_CERT_PATH'),
      clientKeyPath: this.configService.get<string>('CLIENT_KEY_PATH'),
      servername: this.configService.get<string>('TLS_SERVERNAME'),
      rejectUnauthorized:
        this.configService.get<string>('TLS_REJECT_UNAUTHORIZED') !== 'false',
    };
  }

  /**
   * Загружает сертификаты из файлов
   */
  loadCertificatesFromFiles(config: MtlsConfig): MtlsConfig {
    if (!config.useTls) {
      return config;
    }

    try {
      // Загружаем CA сертификат
      if (config.caCertPath && fs.existsSync(config.caCertPath)) {
        config.caCert = fs.readFileSync(config.caCertPath, 'utf8');
        this.logger.log(`CA сертификат загружен из: ${config.caCertPath}`);
      }

      // Загружаем клиентский сертификат
      if (config.clientCertPath && fs.existsSync(config.clientCertPath)) {
        config.clientCert = fs.readFileSync(config.clientCertPath, 'utf8');
        this.logger.log(
          `Клиентский сертификат загружен из: ${config.clientCertPath}`
        );
      }

      // Загружаем приватный ключ
      if (config.clientKeyPath && fs.existsSync(config.clientKeyPath)) {
        config.clientKey = fs.readFileSync(config.clientKeyPath, 'utf8');
        this.logger.log(`Приватный ключ загружен из: ${config.clientKeyPath}`);
      }

      return config;
    } catch (error) {
      this.logger.error('Ошибка загрузки сертификатов:', error);
      throw new Error('Не удалось загрузить сертификаты для mTLS');
    }
  }

  /**
   * Устанавливает сертификаты непосредственно
   */
  setCertificates(
    config: MtlsConfig,
    caCert: string,
    clientCert: string,
    clientKey: string
  ): MtlsConfig {
    config.caCert = caCert;
    config.clientCert = clientCert;
    config.clientKey = clientKey;

    this.logger.log('Сертификаты установлены непосредственно');
    return config;
  }

  /**
   * Сохраняет сертификаты в файлы для повторного использования
   */
  saveCertificatesToFiles(
    config: MtlsConfig,
    certsDir: string,
    deviceId: string
  ): void {
    if (!config.caCert || !config.clientCert || !config.clientKey) {
      throw new Error('Сертификаты не загружены');
    }

    try {
      // Создаем директорию для сертификатов
      const deviceCertsDir = path.join(certsDir, 'devices');
      if (!fs.existsSync(deviceCertsDir)) {
        fs.mkdirSync(deviceCertsDir, { recursive: true });
      }

      // Сохраняем CA сертификат
      const caCertPath = path.join(deviceCertsDir, 'ca-cert.pem');
      fs.writeFileSync(caCertPath, config.caCert);
      fs.chmodSync(caCertPath, 0o644);

      // Сохраняем клиентский сертификат
      const clientCertPath = path.join(deviceCertsDir, `${deviceId}-cert.pem`);
      fs.writeFileSync(clientCertPath, config.clientCert);
      fs.chmodSync(clientCertPath, 0o644);

      // Сохраняем приватный ключ
      const clientKeyPath = path.join(deviceCertsDir, `${deviceId}-key.pem`);
      fs.writeFileSync(clientKeyPath, config.clientKey);
      fs.chmodSync(clientKeyPath, 0o600); // Только владелец может читать

      config.caCertPath = caCertPath;
      config.clientCertPath = clientCertPath;
      config.clientKeyPath = clientKeyPath;

      this.logger.log(`Сертификаты сохранены для устройства ${deviceId}:`);
      this.logger.log(`  CA: ${caCertPath}`);
      this.logger.log(`  Cert: ${clientCertPath}`);
      this.logger.log(`  Key: ${clientKeyPath}`);
    } catch (error) {
      this.logger.error('Ошибка сохранения сертификатов:', error);
      throw new Error('Не удалось сохранить сертификаты');
    }
  }

  /**
   * Проверяет, что все необходимые сертификаты доступны
   */
  validateMtlsConfig(config: MtlsConfig): boolean {
    if (!config.useTls) {
      return true;
    }

    const hasFiles =
      config.caCertPath &&
      config.clientCertPath &&
      config.clientKeyPath &&
      fs.existsSync(config.caCertPath) &&
      fs.existsSync(config.clientCertPath) &&
      fs.existsSync(config.clientKeyPath);

    const hasContent = config.caCert && config.clientCert && config.clientKey;

    return !!(hasFiles || hasContent);
  }

  /**
   * Получает конфигурацию для MQTT клиента
   */
  getMqttTlsOptions(config: MtlsConfig) {
    if (!config.useTls) {
      return null;
    }

    return {
      ca: config.caCert,
      cert: config.clientCert,
      key: config.clientKey,
      servername: config.servername || config.brokerHost,
      rejectUnauthorized: config.rejectUnauthorized,
    };
  }
}
