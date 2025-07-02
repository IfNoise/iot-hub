import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity.js';
import { Device } from './entities/device.entity.js';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as os from 'os';
// crypto больше не используется, так как мы используем OpenSSL напрямую
import { promisify } from 'util';
// Удалены неиспользуемые импорты @peculiar/x509 и @peculiar/webcrypto
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Промисифицируем exec для выполнения команд OpenSSL
const exec = promisify(child_process.exec);

export interface DeviceCertificateRequest {
  deviceId: string;
  csrPem: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

export interface DeviceCertificateResponse {
  deviceId: string;
  clientCert: string;
  caCert: string;
  brokerUrl: string;
  mqttPort: number;
  mqttSecurePort: number;
  fingerprint: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  deviceId?: string;
  reason?: string;
  fingerprint: string;
}

/**
 * Сервис для управления mTLS сертификатами устройств с криптографическими чипами
 *
 * Реализует правильный PKI флоу:
 * 1. Устройство генерирует ключевую пару на криптографическом чипе
 * 2. Устройство создает CSR (Certificate Signing Request)
 * 3. Backend подписывает CSR с помощью CA
 * 4. Устройство получает подписанный сертификат
 * 5. Устройство использует сертификат для mTLS подключения к EMQX
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly certsDir: string;
  private persistentCACert?: string;
  private persistentCAKey?: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>
  ) {
    // Определяем путь к сертификатам
    // Используем единую директорию /certs для всех сертификатов проекта
    if (process.env.NODE_ENV === 'development' && process.env.DOCKER) {
      // В Docker-контейнере
      this.certsDir = '/workspace/certs';
      this.logger.log(`Запуск в Docker. Путь к сертификатам: ${this.certsDir}`);
    } else {
      // Локальный запуск
      this.certsDir = path.resolve(path.join(__dirname, '../../../../certs'));
      this.logger.log(
        `Локальный запуск. Путь к сертификатам: ${this.certsDir}`
      );
    }

    // Создаем директорию для сертификатов
    this.ensureCertsDirectory();

    // Асинхронная инициализация CA с обработкой ошибок
    this.logger.log('Запуск инициализации CA...');
    this.initializePersistentCA().catch((error) => {
      this.logger.error('Критическая ошибка инициализации CA:', error);
      if (error instanceof Error) {
        this.logger.error(`Детали ошибки: ${error.message}`);
        this.logger.error(`Стек вызовов: ${error.stack}`);
      }
    });
  }

  /**
   * Создает директорию для сертификатов если её нет
   */
  private ensureCertsDirectory(): void {
    try {
      if (!fs.existsSync(this.certsDir)) {
        this.logger.log(
          `Директория сертификатов не существует, создаем: ${this.certsDir}`
        );
        fs.mkdirSync(this.certsDir, { recursive: true });
        this.logger.log(
          `Директория для сертификатов успешно создана: ${this.certsDir}`
        );
      } else {
        this.logger.log(
          `Директория сертификатов уже существует: ${this.certsDir}`
        );

        // Проверим наличие файлов в директории
        try {
          const files = fs.readdirSync(this.certsDir);
          this.logger.log(
            `Файлы в директории: ${
              files.length > 0 ? files.join(', ') : 'пусто'
            }`
          );
        } catch (err) {
          this.logger.warn(
            `Не удалось прочитать содержимое директории: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Ошибка при создании директории сертификатов:`, error);
      if (error instanceof Error) {
        this.logger.error(`Детали: ${error.message}`);
      }
      // Продолжаем работу несмотря на ошибку - возможно она будет обработана позже
    }
  }

  /**
   * Инициализирует постоянный CA для подписи сертификатов
   *
   * ВНИМАНИЕ: Сервис только проверяет наличие и валидность файлов сертификатов,
   * но не генерирует их. Генерация должна быть выполнена внешними скриптами.
   */
  private async initializePersistentCA(): Promise<void> {
    // Используем только PKCS#8 формат для приватного ключа
    const caKeyPath = path.join(this.certsDir, 'ca-key-pkcs8.pem');
    const caCertPath = path.join(this.certsDir, 'ca-cert.pem');

    this.logger.log(
      `Инициализация CA с путями: ключ=${caKeyPath}, сертификат=${caCertPath}`
    );

    try {
      // Проверяем наличие файлов
      const keyExists = fs.existsSync(caKeyPath);
      const certExists = fs.existsSync(caCertPath);

      this.logger.log(
        `Проверка файлов: ключ существует=${keyExists}, сертификат существует=${certExists}`
      );

      if (keyExists && certExists) {
        // Загружаем существующий CA
        this.logger.log('Загрузка существующего CA...');
        this.persistentCAKey = fs.readFileSync(caKeyPath, 'utf8');
        this.persistentCACert = fs.readFileSync(caCertPath, 'utf8');

        // Проверка формата ключа
        if (this.persistentCAKey.includes('-----BEGIN PRIVATE KEY-----')) {
          this.logger.log(
            'Постоянный CA сертификат загружен из файловой системы (PKCS#8 формат)'
          );
        } else {
          this.logger.error('Загруженный CA ключ не в формате PKCS#8.');
          throw new Error(
            'CA ключ не в формате PKCS#8. Сгенерируйте корректные сертификаты с помощью скрипта generate-ca-certs.sh'
          );
        }
      } else {
        // Сертификаты не найдены - выдаем ошибку с подробным описанием
        const missingFiles = [];
        if (!keyExists) missingFiles.push('ca-key-pkcs8.pem');
        if (!certExists) missingFiles.push('ca-cert.pem');

        this.logger.error(
          `Файлы CA не найдены в директории ${
            this.certsDir
          }: ${missingFiles.join(', ')}`
        );
        throw new Error(
          `Сертификаты CA не найдены (${missingFiles.join(
            ', '
          )}). Сгенерируйте их с помощью скрипта generate-ca-certs.sh`
        );
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Ошибка инициализации постоянного CA:', error);
      this.logger.error(`Детали ошибки: ${errorMsg}`);
      if (stack) {
        this.logger.error(`Стек вызовов: ${stack}`);
      }
      throw new Error(
        `Не удалось инициализировать постоянный CA сертификат: ${errorMsg}`
      );
    }
  }

  // Метод generatePersistentCA удален
  // Теперь сертификаты генерируются только внешними скриптами

  /**
   * Подписывает CSR от устройства с помощью постоянного CA
   */
  async signDeviceCSR(
    request: DeviceCertificateRequest
  ): Promise<DeviceCertificateResponse> {
    const { deviceId, csrPem, firmwareVersion } = request;

    this.logger.log(
      `Получен запрос на подписание CSR для устройства: ${deviceId}`
    );

    // Логируем полученные данные для отладки
    this.logger.debug(`Подробная информация о запросе:`, {
      deviceId,
      firmwareVersion,
      csrPemLength: csrPem?.length || 0,
      csrPemType: typeof csrPem,
      csrPemDefined: !!csrPem,
      requestKeys: Object.keys(request),
      csrPemStart: csrPem?.substring(0, 50) || 'undefined',
      csrPemEnd: csrPem?.substring(csrPem.length - 50) || 'undefined',
    });

    // Получаем MQTT конфигурацию - для устройств ВСЕГДА используем только mTLS
    let brokerHost: string;
    let mqttSecurePort: number;

    try {
      this.logger.log(`Получение конфигурации MQTT для mTLS устройства...`);
      const mqttConfig = this.configService.getMqttConfig();

      // Извлекаем хост из brokerUrl
      const url = new URL(mqttConfig?.brokerUrl || 'mqtt://localhost:1883');
      brokerHost = url.hostname;
      mqttSecurePort = mqttConfig?.securePort || 8883;

      this.logger.log(
        `MQTT конфигурация для устройства: mqtts://${brokerHost}:${mqttSecurePort} (только mTLS)`
      );
    } catch (error) {
      this.logger.warn(
        'Ошибка получения MQTT конфигурации, используем значения по умолчанию:',
        error
      );
      brokerHost = 'localhost';
      mqttSecurePort = 8883;
    }

    // Проверяем, существует ли устройство
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device) {
      throw new Error(`Устройство ${deviceId} не найдено в системе`);
    }

    // Проверяем, есть ли уже сертификат
    if (device.certificate) {
      // Можно разрешить обновление сертификата или запретить
      this.logger.warn(
        `Устройство ${deviceId} уже имеет сертификат. Обновляем...`
      );
      await this.certificateRepository.remove(device.certificate);
    }

    try {
      // Валидируем и подписываем CSR с помощью постоянного CA
      this.logger.log(`Подписание CSR для устройства ${deviceId}...`);
      const signedResult = await this.signCSRWithPersistentCA(deviceId, csrPem);

      // Извлекаем информацию о сертификате с помощью OpenSSL
      this.logger.log(`Извлечение метаданных сертификата...`);

      // Создаем временный файл для сертификата
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'iot-hub-cert-info-')
      );
      const certPath = path.join(tempDir, 'cert.pem');
      let serialNumber: string;
      let validFrom: string;
      let validTo: string;

      try {
        // Записываем сертификат во временный файл
        fs.writeFileSync(certPath, signedResult.clientCert);

        // Получаем серийный номер
        const serialNumberResult = child_process.execSync(
          `openssl x509 -in "${certPath}" -noout -serial`,
          { encoding: 'utf8' }
        );
        serialNumber = serialNumberResult.trim().split('=')[1];

        // Получаем даты действия
        const datesResult = child_process.execSync(
          `openssl x509 -in "${certPath}" -noout -dates`,
          { encoding: 'utf8' }
        );

        const notBeforeLine = datesResult
          .split('\n')
          .find((line) => line.startsWith('notBefore='));
        const notAfterLine = datesResult
          .split('\n')
          .find((line) => line.startsWith('notAfter='));

        // Парсим даты из формата OpenSSL в формат ISO
        const parseOpenSSLDate = (dateStr: string): string => {
          // OpenSSL формат: 'Jun 11 00:00:00 2025 GMT'
          const date = new Date(dateStr.replace(' GMT', ''));
          return date.toISOString();
        };

        if (notBeforeLine && notAfterLine) {
          validFrom = parseOpenSSLDate(notBeforeLine.replace('notBefore=', ''));
          validTo = parseOpenSSLDate(notAfterLine.replace('notAfter=', ''));
        } else {
          // Если что-то пошло не так, используем текущую дату и дату через год
          const now = new Date();
          validFrom = now.toISOString();
          validTo = new Date(
            now.getTime() + 365 * 24 * 60 * 60 * 1000
          ).toISOString();
          this.logger.warn(
            `Не удалось прочитать даты сертификата, используем значения по умолчанию`
          );
        }

        // Логируем полученные данные
        this.logger.log(
          `Метаданные сертификата: серийный номер=${serialNumber}, действителен с=${validFrom}, до=${validTo}`
        );
      } finally {
        // Очистка временных файлов
        try {
          if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
          }
          fs.rmdirSync(tempDir);
        } catch (err) {
          this.logger.warn(`Не удалось очистить временные файлы: ${err}`);
        }
      }

      // Сохраняем сертификат в базу данных
      this.logger.log(`Сохранение сертификата в базу данных...`);
      const certificate = this.certificateRepository.create({
        clientCert: signedResult.clientCert,
        caCert: signedResult.caCert,
        fingerprint: signedResult.fingerprint,
        deviceId: device.id,
        status: 'active',
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        serialNumber: serialNumber,
      });

      const savedCertificate = await this.certificateRepository.save(
        certificate
      );

      // Обновляем информацию об устройстве
      this.logger.log(`Обновление информации об устройстве...`);
      if (firmwareVersion) {
        device.firmwareVersion = firmwareVersion;
      }
      device.lastSeenAt = new Date();
      device.certificate = savedCertificate;
      await this.deviceRepository.save(device);

      this.logger.log(
        `Сертификат для устройства ${deviceId} подписан и сохранен в базе данных`
      );

      // Формируем ответ - устройства ВСЕГДА используют только mTLS
      this.logger.log(`Формирование ответа для mTLS устройства...`);
      const response: DeviceCertificateResponse = {
        deviceId: deviceId,
        clientCert: signedResult.clientCert,
        caCert: signedResult.caCert,
        brokerUrl: `mqtts://${brokerHost}:${mqttSecurePort}`, // ТОЛЬКО mTLS
        mqttPort: 0, // Не используется для устройств
        mqttSecurePort: mqttSecurePort,
        fingerprint: signedResult.fingerprint,
        serialNumber: serialNumber,
        validFrom: validFrom,
        validTo: validTo,
      };

      this.logger.log(`Ответ сформирован успешно для устройства ${deviceId}`);
      this.logger.log(`Response fields check:`, {
        hasDeviceId: !!response.deviceId,
        hasClientCert: !!response.clientCert,
        hasCaCert: !!response.caCert,
        hasFingerprint: !!response.fingerprint,
        clientCertLength: response.clientCert?.length || 0,
        caCertLength: response.caCert?.length || 0,
      });

      return response;
    } catch (error: unknown) {
      this.logger.error(
        `Ошибка подписания CSR для устройства ${deviceId}:`,
        error
      );
      this.logger.error(
        `Стек ошибки:`,
        error instanceof Error ? error.stack : 'No stack trace available'
      );
      this.logger.error(`Подробная информация об ошибке:`, {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorStringified: JSON.stringify(
          error,
          Object.getOwnPropertyNames(error)
        ),
      });
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Не удалось подписать CSR: ${errorMessage}`);
    }
  }

  /**
   * Подписывает CSR с помощью постоянного CA
   *
   * Production-ready реализация использующая OpenSSL напрямую через child_process
   * Это надежное решение, используемое в промышленных системах
   */
  private async signCSRWithPersistentCA(deviceId: string, csrPem: string) {
    if (!this.persistentCACert || !this.persistentCAKey) {
      throw new Error('Постоянный CA не инициализирован');
    }

    this.logger.log(
      `Подписание CSR для устройства ${deviceId} с помощью OpenSSL`
    );

    // Детальное логирование CSR для отладки
    this.logger.log(`Отладка CSR для устройства ${deviceId}:`);
    this.logger.log(`CSR длина: ${csrPem?.length || 'undefined'}`);
    this.logger.log(`CSR тип: ${typeof csrPem}`);
    this.logger.log(
      `CSR первые 100 символов: ${csrPem?.substring(0, 100) || 'undefined'}`
    );
    this.logger.log(
      `CSR последние 100 символов: ${
        csrPem?.substring(csrPem.length - 100) || 'undefined'
      }`
    );

    // Проверяем и очищаем CSR
    if (!csrPem || typeof csrPem !== 'string') {
      throw new Error('CSR is empty or not a string');
    }

    // Удаляем лишние пробелы и переносы строк
    const cleanCsrPem = csrPem.trim();

    // Проверяем формат PEM
    if (!cleanCsrPem.startsWith('-----BEGIN CERTIFICATE REQUEST-----')) {
      this.logger.error(
        `Неверный формат CSR. Начинается с: ${cleanCsrPem.substring(0, 50)}`
      );
      throw new Error('CSR does not start with proper PEM header');
    }

    if (!cleanCsrPem.endsWith('-----END CERTIFICATE REQUEST-----')) {
      this.logger.error(
        `Неверный формат CSR. Заканчивается на: ${cleanCsrPem.substring(
          cleanCsrPem.length - 50
        )}`
      );
      throw new Error('CSR does not end with proper PEM footer');
    }

    try {
      // Создаем временные файлы для работы с OpenSSL
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iot-hub-certs-'));
      this.logger.log(`Создан временный каталог для сертификатов: ${tempDir}`);

      // Пути к временным файлам
      const csrPath = path.join(tempDir, 'device.csr');
      const certPath = path.join(tempDir, 'device.crt');
      const caKeyPath = path.join(tempDir, 'ca-key.pem');
      const caCertPath = path.join(tempDir, 'ca-cert.pem');
      const openSslConfigPath = path.join(tempDir, 'openssl.cnf');

      // Записываем CSR во временный файл
      fs.writeFileSync(csrPath, cleanCsrPem);
      this.logger.log(`CSR записан во временный файл: ${csrPath}`);

      // Записываем CA сертификат и ключ во временные файлы
      fs.writeFileSync(caKeyPath, this.persistentCAKey);
      fs.writeFileSync(caCertPath, this.persistentCACert);
      this.logger.log(`CA сертификат и ключ записаны во временные файлы`);

      // Создаем конфигурацию OpenSSL для подписи сертификата
      const openSslConfig = `
[ ca ]
default_ca = CA_default

[ CA_default ]
database = /dev/null
serial = /dev/null
new_certs_dir = .
policy = policy_anything
copy_extensions = copy

[ policy_anything ]
countryName = optional
stateOrProvinceName = optional
localityName = optional
organizationName = optional
organizationalUnitName = optional
commonName = supplied
emailAddress = optional

[ req ]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[ req_distinguished_name ]
CN = IoT Hub Device

[ v3_req ]
subjectKeyIdentifier = hash
basicConstraints = CA:false
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
`;
      fs.writeFileSync(openSslConfigPath, openSslConfig);
      this.logger.log(
        `Создан конфигурационный файл OpenSSL: ${openSslConfigPath}`
      );

      // Формируем серийный номер сертификата
      const serialNumber = this.generateSerialNumber();
      this.logger.log(
        `Сгенерирован серийный номер сертификата: ${serialNumber}`
      );

      // Команда OpenSSL для подписания CSR
      const openSslCommand = `openssl x509 -req \
        -in "${csrPath}" \
        -CA "${caCertPath}" \
        -CAkey "${caKeyPath}" \
        -set_serial 0x${serialNumber} \
        -days 365 \
        -extfile "${openSslConfigPath}" \
        -extensions v3_req \
        -out "${certPath}"`;

      // Выполняем команду OpenSSL
      this.logger.log(`Выполняем команду OpenSSL для подписания CSR...`);
      const { stderr } = await exec(openSslCommand);

      if (stderr && !stderr.includes('Getting CA Private Key')) {
        this.logger.warn(`OpenSSL предупреждение: ${stderr}`);
      }

      // Проверяем, что сертификат создан
      if (!fs.existsSync(certPath)) {
        throw new Error('OpenSSL не создал сертификат');
      }

      // Читаем созданный сертификат
      const clientCertPem = fs.readFileSync(certPath, 'utf8');
      this.logger.log(
        `Сертификат успешно подписан OpenSSL, размер: ${clientCertPem.length} байт`
      );

      // Проверяем подпись сертификата
      const verifyCommand = `openssl verify -CAfile "${caCertPath}" "${certPath}"`;
      const verifyResult = await exec(verifyCommand);
      this.logger.log(`Проверка подписи: ${verifyResult.stdout.trim()}`);

      // Вычисляем отпечаток сертификата
      const fingerprintCommand = `openssl x509 -in "${certPath}" -noout -fingerprint -sha256`;
      const fingerprintResult = await exec(fingerprintCommand);
      // Парсинг формата "SHA256 Fingerprint=AB:CD:EF:..."
      const fingerprint = fingerprintResult.stdout.trim().split('=')[1].trim();

      this.logger.log(`Отпечаток сертификата: ${fingerprint}`);

      // Очищаем временные файлы
      this.logger.log(`Очистка временных файлов...`);
      try {
        fs.unlinkSync(csrPath);
        fs.unlinkSync(certPath);
        fs.unlinkSync(caKeyPath);
        fs.unlinkSync(caCertPath);
        fs.unlinkSync(openSslConfigPath);
        fs.rmdirSync(tempDir);
        this.logger.log(`Временные файлы успешно удалены`);
      } catch (cleanupError) {
        this.logger.warn(
          `Не удалось удалить все временные файлы: ${cleanupError}`
        );
      }

      // Возвращаем результаты
      return {
        clientCert: clientCertPem,
        caCert: this.persistentCACert,
        fingerprint,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка подписания CSR для устройства ${deviceId}:`,
        error
      );
      if (error instanceof Error) {
        this.logger.error(`Стек ошибки: ${error.stack}`);
      }
      throw new Error(
        `Failed to sign CSR: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Получает сертификат устройства из базы данных
   */
  async getDeviceCertificate(deviceId: string): Promise<Certificate | null> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    return device?.certificate || null;
  }

  /**
   * Отзывает сертификат устройства
   */
  async revokeCertificate(deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['certificate'],
    });

    if (!device || !device.certificate) {
      throw new Error(`Сертификат для устройства ${deviceId} не найден`);
    }

    // Удаляем из базы данных
    await this.certificateRepository.remove(device.certificate);

    // Обновляем статус устройства
    device.status = 'revoked';
    device.certificate = undefined;
    await this.deviceRepository.save(device);

    this.logger.log(`Сертификат для устройства ${deviceId} отозван`);
  }

  /**
   * Валидирует сертификат устройства по отпечатку
   * Использует OpenSSL для проверки сертификата (production-ready решение)
   */
  async validateCertificate(
    fingerprint: string
  ): Promise<CertificateValidationResult> {
    try {
      const certificate = await this.certificateRepository.findOne({
        where: { fingerprint },
        relations: ['device'],
      });

      if (!certificate) {
        return {
          valid: false,
          reason: 'Certificate not found',
          fingerprint,
        };
      }

      // Проверяем статус устройства
      if (certificate.device.status === 'revoked') {
        return {
          valid: false,
          reason: 'Certificate revoked',
          deviceId: certificate.device.id,
          fingerprint,
        };
      }

      // Создаем временные файлы для проверки через OpenSSL
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iot-hub-verify-'));
      const certPath = path.join(tempDir, 'client-cert.pem');
      const caCertPath = path.join(tempDir, 'ca-cert.pem');

      try {
        // Записываем сертификаты во временные файлы
        fs.writeFileSync(certPath, certificate.clientCert);
        if (!this.persistentCACert) {
          throw new Error('CA сертификат не инициализирован');
        }
        fs.writeFileSync(caCertPath, this.persistentCACert);

        // Получаем информацию о сроке действия сертификата через OpenSSL
        const dateInfoCommand = `openssl x509 -in "${certPath}" -noout -dates`;
        const { stdout: dateOutput } = await exec(dateInfoCommand);

        // Парсим вывод OpenSSL, например:
        // notBefore=May 30 12:00:00 2023 GMT
        // notAfter=May 29 12:00:00 2024 GMT
        const notBeforeLine = dateOutput.match(/notBefore=(.+)/)?.[1];
        const notAfterLine = dateOutput.match(/notAfter=(.+)/)?.[1];

        if (!notBeforeLine || !notAfterLine) {
          throw new Error('Не удалось определить срок действия сертификата');
        }

        const notBefore = new Date(notBeforeLine);
        const notAfter = new Date(notAfterLine);
        const now = new Date();

        // Проверяем валидность сертификата по времени
        if (now < notBefore) {
          return {
            valid: false,
            reason: 'Certificate not yet valid',
            deviceId: certificate.device.id,
            fingerprint,
          };
        }

        if (now > notAfter) {
          return {
            valid: false,
            reason: 'Certificate expired',
            deviceId: certificate.device.id,
            fingerprint,
          };
        }

        // Проверяем валидность подписи с помощью CA
        const verifyCommand = `openssl verify -CAfile "${caCertPath}" "${certPath}"`;
        const { stdout: verifyOutput, stderr: verifyError } = await exec(
          verifyCommand
        );

        if (!verifyOutput.includes('OK')) {
          this.logger.error(
            `Ошибка верификации сертификата: ${verifyOutput} ${verifyError}`
          );
          return {
            valid: false,
            reason: 'Invalid signature',
            deviceId: certificate.device.id,
            fingerprint,
          };
        }

        return {
          valid: true,
          deviceId: certificate.device.id,
          fingerprint,
        };
      } finally {
        // Удаляем временные файлы
        try {
          fs.unlinkSync(certPath);
          fs.unlinkSync(caCertPath);
          fs.rmdirSync(tempDir);
        } catch (cleanupError) {
          this.logger.warn(
            `Не удалось удалить временные файлы: ${
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError)
            }`
          );
        }
      }
    } catch (error) {
      this.logger.error('Ошибка валидации сертификата:', error);
      return {
        valid: false,
        reason: 'Validation error',
        fingerprint,
      };
    }
  }

  /**
   * Валидирует сертификат для MQTT подключения через EMQX
   * Проверяет отпечаток, статус сертификата и соответствие clientId
   */
  async validateCertificateForMQTT(
    fingerprint: string,
    commonName: string,
    clientId: string
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Валидация MQTT сертификата: fingerprint=${fingerprint}, CN=${commonName}, clientId=${clientId}`
      );

      // НОВЫЙ ПОДХОД: Сначала ищем устройство по deviceId (clientId)
      this.logger.log(`1. Поиск устройства по deviceId: ${clientId}`);
      const device = await this.deviceRepository.findOne({
        where: { id: clientId },
        relations: ['certificate'], // ИСПРАВЛЕНО: одиночная связь
      });

      if (!device) {
        this.logger.warn(
          `Устройство с ID ${clientId} не найдено в базе данных`
        );
        return false;
      }

      this.logger.log(
        `2. Устройство найдено: ${device.id}, статус: ${device.status}`
      );
      this.logger.log(
        `3. Сертификат у устройства: ${
          device.certificate ? 'есть' : 'отсутствует'
        }`
      );

      if (!device.certificate) {
        this.logger.warn(
          `У устройства ${clientId} нет сертификата в базе данных`
        );
        return false;
      }

      this.logger.log(
        `4. Сравниваем fingerprint: сохраненный=${device.certificate.fingerprint}, полученный=${fingerprint}`
      );

      // Проверяем соответствие fingerprint
      if (device.certificate.fingerprint !== fingerprint) {
        this.logger.warn(
          `Сертификат с отпечатком ${fingerprint} не соответствует. Ожидаемый: ${device.certificate.fingerprint}, получен: ${fingerprint}`
        );
        return false;
      }

      this.logger.log(
        `6. Сертификат найден, проверяем статус: ${device.certificate.status}`
      );

      // Проверяем, что сертификат активен
      if (device.certificate.status !== 'active') {
        this.logger.warn(
          `Сертификат имеет неактивный статус: ${device.certificate.status}`
        );
        return false;
      }

      // Проверяем срок действия
      const now = new Date();
      if (device.certificate.validTo < now) {
        this.logger.warn(`Сертификат истек: ${device.certificate.validTo}`);
        return false;
      }

      if (device.certificate.validFrom > now) {
        this.logger.warn(
          `Сертификат еще не действителен: ${device.certificate.validFrom}`
        );
        return false;
      }

      // Проверяем Common Name (должен соответствовать deviceId)
      if (commonName !== device.id) {
        this.logger.warn(
          `Common Name ${commonName} не соответствует deviceId ${device.id}`
        );
        return false;
      }

      this.logger.log(
        `6. Сертификат успешно валидирован для устройства ${clientId}`
      );
      return true;
    } catch (error) {
      this.logger.error('Ошибка валидации сертификата для MQTT:', error);
      return false;
    }
  }

  /**
   * Получает CA сертификат для конфигурации EMQX
   */
  getCACertificate(): string {
    if (!this.persistentCACert) {
      throw new Error('CA сертификат не инициализирован');
    }
    return this.persistentCACert;
  }

  /**
   * Генерирует серийный номер для сертификата
   */
  private generateSerialNumber(): string {
    return Math.floor(Math.random() * 1000000).toString(16);
  }

  // Метод bufferToPem удален, поскольку он использовался только в generatePersistentCA
  // и больше не нужен для работы сервиса

  /**
   * Конвертирует PEM в ArrayBuffer
   */
  // Метод pemToBuffer удален, так как больше не используется

  /**
   * Метод calculateFingerprintFromPem удален, так как он заменен
   * прямым использованием OpenSSL в методе signCSRWithPersistentCA
   */
}
