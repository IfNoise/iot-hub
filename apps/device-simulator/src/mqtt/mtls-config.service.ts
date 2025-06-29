import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface MtlsConfig {
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  passphrase?: string;
  rejectUnauthorized: boolean;
  servername?: string;
}

export interface CertificateFiles {
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
}

/**
 * Сервис для управления конфигурацией mTLS в device-simulator
 */
@Injectable()
export class MtlsConfigService {
  private readonly logger = new Logger(MtlsConfigService.name);

  /**
   * Загружает сертификаты из файлов
   */
  loadCertificatesFromFiles(certFiles: CertificateFiles): MtlsConfig | null {
    try {
      const config: MtlsConfig = {
        rejectUnauthorized: false, // Для локальной разработки разрешаем самоподписанные сертификаты
      };

      if (certFiles.caCertPath && fs.existsSync(certFiles.caCertPath)) {
        config.caCert = fs.readFileSync(certFiles.caCertPath, 'utf8');
        this.logger.log(`CA сертификат загружен: ${certFiles.caCertPath}`);
      }

      if (certFiles.clientCertPath && fs.existsSync(certFiles.clientCertPath)) {
        config.clientCert = fs.readFileSync(certFiles.clientCertPath, 'utf8');
        this.logger.log(
          `Клиентский сертификат загружен: ${certFiles.clientCertPath}`
        );
      }

      if (certFiles.clientKeyPath && fs.existsSync(certFiles.clientKeyPath)) {
        config.clientKey = fs.readFileSync(certFiles.clientKeyPath, 'utf8');
        this.logger.log(`Клиентский ключ загружен: ${certFiles.clientKeyPath}`);
      }

      // Проверяем, что у нас есть все необходимые сертификаты для mTLS
      if (!config.caCert || !config.clientCert || !config.clientKey) {
        this.logger.warn(
          'Не все сертификаты для mTLS загружены. mTLS не будет использоваться.'
        );
        return null;
      }

      return config;
    } catch (error) {
      this.logger.error('Ошибка загрузки сертификатов:', error);
      return null;
    }
  }

  /**
   * Создает конфигурацию mTLS из строковых значений сертификатов
   */
  createMtlsConfig(
    caCert: string,
    clientCert: string,
    clientKey: string,
    options?: {
      passphrase?: string;
      rejectUnauthorized?: boolean;
      servername?: string;
    }
  ): MtlsConfig {
    return {
      caCert,
      clientCert,
      clientKey,
      passphrase: options?.passphrase,
      rejectUnauthorized: options?.rejectUnauthorized ?? true,
      servername: options?.servername,
    };
  }

  /**
   * Сохраняет сертификаты в файлы для device-simulator
   */
  async saveCertificatesToFiles(
    deviceId: string,
    certificates: {
      caCert: string;
      clientCert: string;
      clientKey: string;
    },
    certsDir = './certs/devices'
  ): Promise<CertificateFiles> {
    try {
      // Создаем директорию если её нет
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      const certFiles: CertificateFiles = {
        caCertPath: path.join(certsDir, `${deviceId}-ca-cert.pem`),
        clientCertPath: path.join(certsDir, `${deviceId}-client-cert.pem`),
        clientKeyPath: path.join(certsDir, `${deviceId}-client-key.pem`),
      };

      // Сохраняем сертификаты
      fs.writeFileSync(certFiles.caCertPath, certificates.caCert, 'utf8');
      fs.writeFileSync(
        certFiles.clientCertPath,
        certificates.clientCert,
        'utf8'
      );
      fs.writeFileSync(certFiles.clientKeyPath, certificates.clientKey, 'utf8');

      // Устанавливаем правильные права доступа
      fs.chmodSync(certFiles.clientKeyPath, 0o600); // Приватный ключ - только для владельца
      fs.chmodSync(certFiles.clientCertPath, 0o644); // Сертификаты - для чтения
      fs.chmodSync(certFiles.caCertPath, 0o644);

      this.logger.log(
        `Сертификаты для устройства ${deviceId} сохранены в ${certsDir}`
      );

      return certFiles;
    } catch (error) {
      this.logger.error(
        `Ошибка сохранения сертификатов для устройства ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Валидирует конфигурацию mTLS
   */
  validateMtlsConfig(config: MtlsConfig): boolean {
    if (!config.caCert || !config.clientCert || !config.clientKey) {
      this.logger.error(
        'Конфигурация mTLS неполная: отсутствуют обязательные сертификаты'
      );
      return false;
    }

    // Простая проверка формата PEM
    const pemRegex = /-----BEGIN [A-Z ]+-----[\s\S]*-----END [A-Z ]+-----/;

    if (!pemRegex.test(config.caCert)) {
      this.logger.error('CA сертификат имеет неверный формат PEM');
      return false;
    }

    if (!pemRegex.test(config.clientCert)) {
      this.logger.error('Клиентский сертификат имеет неверный формат PEM');
      return false;
    }

    if (!pemRegex.test(config.clientKey)) {
      this.logger.error('Клиентский ключ имеет неверный формат PEM');
      return false;
    }

    return true;
  }

  /**
   * Получает стандартные пути для сертификатов устройства
   */
  getStandardCertPaths(
    deviceId: string,
    certsDir = './certs/devices'
  ): CertificateFiles {
    return {
      caCertPath: path.join(certsDir, `${deviceId}-ca-cert.pem`),
      clientCertPath: path.join(certsDir, `${deviceId}-client-cert.pem`),
      clientKeyPath: path.join(certsDir, `${deviceId}-client-key.pem`),
    };
  }
}
