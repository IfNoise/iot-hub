import type {
  CertificateInfoSchema,
  RevokeCertificateResponseSchema,
  CACertificateResponseSchema,
  CertificateResponseSchema,
} from '@iot-hub/devices';
import { z } from 'zod';
import type { DeviceCertificateResponse } from '../certificate-mtls.service';

// Типы для сопоставления с контрактами
export type CertificateInfo = z.infer<typeof CertificateInfoSchema>;
export type RevokeCertificateResponse = z.infer<
  typeof RevokeCertificateResponseSchema
>;
export type CACertificateResponse = z.infer<typeof CACertificateResponseSchema>;
export type CertificateResponse = z.infer<typeof CertificateResponseSchema>;

/**
 * Маппер для преобразования данных сертификатов в DTO
 */
export class CertificateMapper {
  /**
   * Преобразует DeviceCertificateResponse в CertificateResponse DTO
   */
  static toCertificateResponse(
    response: DeviceCertificateResponse
  ): CertificateResponse {
    return {
      certificate: response.clientCert,
      caCertificate: response.caCert,
      fingerprint: response.fingerprint,
    };
  }

  /**
   * Преобразует ответ сервиса в CertificateInfo DTO
   */
  static toCertificateInfo(
    deviceId: string,
    data: Record<string, unknown>
  ): CertificateInfo {
    return {
      deviceId,
      serialNumber: (data.serialNumber as string) || '1234567890ABCDEF',
      validFrom: (data.validFrom as string) || new Date().toISOString(),
      validTo:
        (data.validTo as string) ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: (data.status as 'active' | 'revoked' | 'expired') || 'active',
      fingerprint: (data.fingerprint as string) || 'sha256:ABC123...',
    };
  }

  /**
   * Преобразует ответ сервиса в RevokeCertificateResponse DTO
   */
  static toRevokeCertificateResponse(
    deviceId: string
  ): RevokeCertificateResponse {
    return {
      message: 'Сертификат успешно отозван',
      deviceId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Преобразует ответ сервиса в CACertificateResponse DTO
   */
  static toCACertificateResponse(caCert: string): CACertificateResponse {
    return {
      caCert,
      pemFormat: true,
      timestamp: new Date().toISOString(),
    };
  }
}
