import { Controller, Logger } from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';
import {
  CertificateService,
  DeviceCertificateRequest,
} from './certificate-mtls.service.js';
import { certificatesContract } from '@iot-hub/devices';
import { CertificateMapper } from './mappers/certificate.mapper.js';

/**
 * Контроллер для управления mTLS сертификатами устройств
 *
 * Предоставляет API для правильного PKI флоу:
 * - Получение CSR от устройства
 * - Подписание CSR с помощью CA
 * - Выдача подписанного сертификата устройству
 * - Валидация сертификатов для EMQX
 */
@Controller()
export class CertificatesController {
  private readonly logger = new Logger(CertificatesController.name);

  constructor(private readonly certificateService: CertificateService) {}

  @TsRestHandler(certificatesContract.signDeviceCSR)
  async signDeviceCSR() {
    return tsRestHandler(
      certificatesContract.signDeviceCSR,
      async ({ params, body }) => {
        try {
          this.logger.log(
            `Запрос на подписание CSR для устройства: ${params.deviceId}`
          );

          const request: DeviceCertificateRequest = {
            deviceId: params.deviceId,
            csrPem: body.csrPem,
            firmwareVersion: body.firmwareVersion,
            hardwareVersion: body.hardwareVersion,
          };

          const response = await this.certificateService.signDeviceCSR(request);

          this.logger.log(
            `Сервис вернул ответ для устройства ${params.deviceId}`
          );
          this.logger.log(`Response type check:`, {
            isObject: typeof response === 'object',
            hasClientCert: 'clientCert' in response,
            hasCaCert: 'caCert' in response,
            hasFingerprint: 'fingerprint' in response,
          });

          const mappedResponse =
            CertificateMapper.toCertificateResponse(response);

          this.logger.log(
            `Маппер успешно преобразовал ответ для устройства ${params.deviceId}`
          );

          this.logger.log(
            `CSR успешно подписан для устройства: ${params.deviceId}`
          );

          return {
            status: 201 as const,
            body: mappedResponse,
          };
        } catch (error) {
          this.logger.error(
            `Ошибка подписания CSR для устройства ${params.deviceId}:`,
            error
          );

          if (error instanceof Error) {
            if (error.message.includes('not found')) {
              return {
                status: 404 as const,
                body: { message: 'Устройство не найдено' },
              };
            }
            if (error.message.includes('already exists')) {
              return {
                status: 409 as const,
                body: { message: 'Сертификат уже существует' },
              };
            }
            if (error.message.includes('invalid CSR')) {
              return {
                status: 400 as const,
                body: { message: 'Неверные данные CSR' },
              };
            }
          }

          return {
            status: 500 as const,
            body: { message: 'Внутренняя ошибка сервера при подписании CSR' },
          };
        }
      }
    );
  }

  @TsRestHandler(certificatesContract.getCertificateInfo)
  async getCertificateInfo() {
    return tsRestHandler(
      certificatesContract.getCertificateInfo,
      async ({ params }) => {
        try {
          this.logger.log(
            `Запрос информации о сертификате для устройства: ${params.deviceId}`
          );

          // TODO: Реализовать получение информации о сертификате
          // const certificateInfo = await this.certificateService.getCertificateInfo(params.deviceId);

          const certificateData = {
            serialNumber: '1234567890ABCDEF',
            validFrom: new Date().toISOString(),
            validTo: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            status: 'active',
            fingerprint: 'sha256:ABC123...',
          };

          const certificateInfo = CertificateMapper.toCertificateInfo(
            params.deviceId,
            certificateData
          );

          return {
            status: 200 as const,
            body: certificateInfo,
          };
        } catch (error) {
          this.logger.error(
            `Ошибка получения информации о сертификате для устройства ${params.deviceId}:`,
            error
          );

          if (error instanceof Error && error.message.includes('not found')) {
            return {
              status: 404 as const,
              body: { message: 'Устройство или сертификат не найден' },
            };
          }

          return {
            status: 500 as const,
            body: { message: 'Внутренняя ошибка сервера' },
          };
        }
      }
    );
  }

  @TsRestHandler(certificatesContract.revokeCertificate)
  async revokeCertificate() {
    return tsRestHandler(
      certificatesContract.revokeCertificate,
      async ({ params }) => {
        try {
          this.logger.log(
            `Запрос на отзыв сертификата для устройства: ${params.deviceId}`
          );

          // TODO: Реализовать отзыв сертификата
          // await this.certificateService.revokeCertificate(params.deviceId);

          this.logger.log(
            `Сертификат успешно отозван для устройства: ${params.deviceId}`
          );

          const response = CertificateMapper.toRevokeCertificateResponse(
            params.deviceId
          );

          return {
            status: 200 as const,
            body: response,
          };
        } catch (error) {
          this.logger.error(
            `Ошибка отзыва сертификата для устройства ${params.deviceId}:`,
            error
          );

          if (error instanceof Error && error.message.includes('not found')) {
            return {
              status: 404 as const,
              body: { message: 'Устройство или сертификат не найден' },
            };
          }

          return {
            status: 500 as const,
            body: {
              message: 'Внутренняя ошибка сервера при отзыве сертификата',
            },
          };
        }
      }
    );
  }

  @TsRestHandler(certificatesContract.getCACertificate)
  async getCACertificate() {
    return tsRestHandler(certificatesContract.getCACertificate, async () => {
      try {
        this.logger.log('Запрос CA сертификата');

        const caCert = await this.certificateService.getCACertificate();
        const response = CertificateMapper.toCACertificateResponse(caCert);

        return {
          status: 200 as const,
          body: response,
        };
      } catch (error) {
        this.logger.error('Ошибка получения CA сертификата:', error);

        return {
          status: 500 as const,
          body: {
            message: 'Внутренняя ошибка сервера при получении CA сертификата',
          },
        };
      }
    });
  }

  @TsRestHandler(certificatesContract.validateCertificate)
  async validateCertificate() {
    return tsRestHandler(
      certificatesContract.validateCertificate,
      async ({ body }) => {
        try {
          this.logger.log(
            'EMQX запрос валидации сертификата - ПОЛНЫЙ BODY:',
            body
          );
          this.logger.log('EMQX запрос валидации сертификата:', {
            clientid: body.clientid,
            username: body.username,
            cert_common_name: body.cert_common_name,
            cert_fingerprint: body.password,
          });

          // Проверяем, предоставлен ли сертификат через mTLS
          if (!body.password || !body.cert_common_name) {
            this.logger.warn(
              'EMQX запрос без password или cert_common_name - отклоняем'
            );
            return {
              status: 200 as const,
              body: {
                result: 'deny' as const,
                is_superuser: false,
              },
            };
          }

          // Валидируем сертификат через сервис
          const isValid =
            await this.certificateService.validateCertificateForMQTT(
              body.password,
              body.cert_common_name,
              body.clientid
            );

          if (isValid) {
            this.logger.log(`Сертификат валиден для клиента ${body.clientid}`);
            return {
              status: 200 as const,
              body: {
                result: 'allow' as const,
                is_superuser: false,
                client_attrs: {
                  device_id: body.clientid,
                  auth_method: 'mtls',
                },
              },
            };
          } else {
            this.logger.warn(
              `Сертификат не валиден для клиента ${body.clientid}`
            );
            return {
              status: 200 as const,
              body: {
                result: 'deny' as const,
                is_superuser: false,
              },
            };
          }
        } catch (error) {
          this.logger.error('Ошибка валидации сертификата для EMQX:', error);

          // В случае ошибки отклоняем подключение
          return {
            status: 200 as const,
            body: {
              result: 'deny' as const,
              is_superuser: false,
            },
          };
        }
      }
    );
  }
}
