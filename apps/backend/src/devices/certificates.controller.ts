import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  CertificateService,
  DeviceCertificateRequest,
  DeviceCertificateResponse,
} from './certificate-mtls.service';
import { DevicesService } from './devices.service';

/**
 * DTO для запроса на подписание CSR
 */
export class SignCSRDto {
  csrPem!: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

/**
 * Контроллер для управления mTLS сертификатами устройств
 *
 * Предоставляет API для правильного PKI флоу:
 * - Получение CSR от устройства
 * - Подписание CSR с помощью CA
 * - Выдача подписанного сертификата устройству
 * - Валидация сертификатов для EMQX
 */
@ApiTags('Device mTLS Certificates')
@Controller('devices/certificates')
export class CertificatesController {
  private readonly logger = new Logger(CertificatesController.name);

  constructor(
    private readonly certificateService: CertificateService,
    private readonly devicesService: DevicesService
  ) {}

  /**
   * Подписывает CSR от устройства и выдает сертификат
   */
  @Post(':deviceId/sign-csr')
  @ApiOperation({
    summary: 'Подписание CSR от устройства',
    description:
      'Принимает CSR от устройства с криптографическим чипом, подписывает его CA и возвращает готовый сертификат для mTLS',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Уникальный идентификатор устройства',
    example: 'device-001',
  })
  @ApiBody({
    type: SignCSRDto,
    description: 'CSR в PEM формате и дополнительная информация об устройстве',
    examples: {
      example1: {
        summary: 'Базовый CSR',
        value: {
          csrPem:
            '-----BEGIN CERTIFICATE REQUEST-----\nMIICZjCCAU4CAQAwGTE...\n-----END CERTIFICATE REQUEST-----',
          firmwareVersion: '1.2.3',
          hardwareVersion: 'v2.1',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Сертификат успешно подписан',
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', example: 'device-001' },
        clientCert: { type: 'string', description: 'PEM-сертификат клиента' },
        caCert: { type: 'string', description: 'CA сертификат' },
        brokerUrl: { type: 'string', example: 'localhost' },
        mqttPort: { type: 'number', example: 1883 },
        mqttSecurePort: { type: 'number', example: 8883 },
        fingerprint: { type: 'string', example: 'AA:BB:CC:DD:EE:FF' },
        serialNumber: { type: 'string', example: '1a2b3c' },
        validFrom: { type: 'string', format: 'date-time' },
        validTo: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный CSR или устройство не найдено',
  })
  @ApiResponse({
    status: 500,
    description: 'Ошибка подписания сертификата',
  })
  async signDeviceCSR(
    @Param('deviceId') deviceId: string,
    @Body() signCSRDto: SignCSRDto
  ): Promise<DeviceCertificateResponse> {
    try {
      this.logger.log(`Запрос на подписание CSR для устройства: ${deviceId}`);

      const request: DeviceCertificateRequest = {
        deviceId,
        csrPem: signCSRDto.csrPem,
        firmwareVersion: signCSRDto.firmwareVersion,
        hardwareVersion: signCSRDto.hardwareVersion,
      };

      const certificateResponse = await this.certificateService.signDeviceCSR(
        request
      );

      this.logger.log(`Сертификат для устройства ${deviceId} подписан успешно`);
      return certificateResponse;
    } catch (error) {
      this.logger.error(`Ошибка подписания CSR для ${deviceId}:`, error);

      if (error.message.includes('не найдено')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('CSR verification failed')) {
        throw new HttpException('Неверный CSR', HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        'Ошибка подписания CSR',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получает информацию о сертификате устройства
   */
  @Get(':deviceId')
  @ApiOperation({
    summary: 'Получение информации о сертификате устройства',
    description: 'Возвращает информацию о сертификате без приватного ключа',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Уникальный идентификатор устройства',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о сертификате',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fingerprint: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        isValid: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Сертификат не найден',
  })
  async getCertificateInfo(@Param('deviceId') deviceId: string) {
    try {
      const certificate = await this.certificateService.getDeviceCertificate(
        deviceId
      );

      if (!certificate) {
        throw new HttpException(
          `Сертификат для устройства ${deviceId} не найден`,
          HttpStatus.NOT_FOUND
        );
      }

      // Валидируем сертификат
      const validationResult =
        await this.certificateService.validateCertificate(
          certificate.fingerprint
        );

      return {
        id: certificate.id,
        fingerprint: certificate.fingerprint,
        createdAt: certificate.createdAt,
        isValid: validationResult.valid,
        reason: validationResult.reason,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Ошибка получения информации о сертификате ${deviceId}:`,
        error
      );
      throw new HttpException(
        'Ошибка получения информации о сертификате',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Отзывает сертификат устройства
   */
  @Delete(':deviceId')
  @ApiOperation({
    summary: 'Отзыв сертификата устройства',
    description:
      'Отзывает сертификат и блокирует доступ устройства к MQTT брокеру',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Уникальный идентификатор устройства',
  })
  @ApiResponse({
    status: 200,
    description: 'Сертификат успешно отозван',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Сертификат отозван' },
        deviceId: { type: 'string' },
        revokedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Сертификат не найден',
  })
  async revokeCertificate(@Param('deviceId') deviceId: string) {
    try {
      await this.certificateService.revokeCertificate(deviceId);

      this.logger.log(`Сертификат для устройства ${deviceId} отозван`);

      return {
        message: 'Сертификат отозван',
        deviceId,
        revokedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Ошибка отзыва сертификата ${deviceId}:`, error);

      if (error.message.includes('не найден')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        'Ошибка отзыва сертификата',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получает CA сертификат для конфигурации клиентов
   */
  @Get('ca/certificate')
  @ApiOperation({
    summary: 'Получение CA сертификата',
    description: 'Возвращает CA сертификат для настройки клиентов',
  })
  @ApiResponse({
    status: 200,
    description: 'CA сертификат',
    schema: {
      type: 'object',
      properties: {
        caCert: { type: 'string', description: 'PEM-сертификат CA' },
      },
    },
  })
  getCACertificate() {
    try {
      const caCert = this.certificateService.getCACertificate();

      return {
        caCert,
      };
    } catch (error) {
      this.logger.error('Ошибка получения CA сертификата:', error);
      throw new HttpException(
        'Ошибка получения CA сертификата',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Валидирует сертификат по отпечатку (для EMQX webhook)
   */
  @Post('validate/:fingerprint')
  @ApiOperation({
    summary: 'Валидация сертификата по отпечатку',
    description: 'Эндпоинт для EMQX webhook валидации сертификатов',
  })
  @ApiParam({
    name: 'fingerprint',
    description: 'SHA-256 отпечаток сертификата',
  })
  @ApiResponse({
    status: 200,
    description: 'Результат валидации',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        deviceId: { type: 'string' },
        fingerprint: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  })
  async validateCertificate(@Param('fingerprint') fingerprint: string) {
    try {
      const validationResult =
        await this.certificateService.validateCertificate(fingerprint);

      this.logger.debug(
        `Валидация сертификата ${fingerprint}: ${
          validationResult.valid ? 'valid' : 'invalid'
        }`
      );

      return validationResult;
    } catch (error) {
      this.logger.error(`Ошибка валидации сертификата ${fingerprint}:`, error);

      return {
        valid: false,
        fingerprint,
        reason: 'Validation error',
      };
    }
  }

  /**
   * Получает сертификат устройства по deviceId (для внешних систем, например EMQX)
   */
  @Get('device/:deviceId/certificate')
  @ApiOperation({
    summary: 'Получить сертификат устройства',
    description:
      'Возвращает клиентский сертификат устройства для использования во внешних системах',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Уникальный идентификатор устройства',
  })
  @ApiResponse({
    status: 200,
    description: 'Сертификат успешно получен',
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        clientCert: { type: 'string' },
        fingerprint: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Сертификат не найден',
  })
  async getDeviceCertificate(@Param('deviceId') deviceId: string) {
    this.logger.log(`Запрос сертификата для устройства: ${deviceId}`);

    const certificate = await this.certificateService.getDeviceCertificate(
      deviceId
    );

    if (!certificate) {
      throw new HttpException(
        `Сертификат для устройства ${deviceId} не найден`,
        HttpStatus.NOT_FOUND
      );
    }

    return {
      deviceId,
      clientCert: certificate.clientCert,
      fingerprint: certificate.fingerprint,
      createdAt: certificate.createdAt,
    };
  }
}
