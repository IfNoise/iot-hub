// DEPRECATED: Этот сервис был заменен на OpenSSL через child_process
// в CertificateService (apps/backend/src/devices/certificate-mtls.service.ts)
// Оставлено только как референс для миграции

import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
  constructor() {
    throw new Error(
      'CryptoService is deprecated. Use CertificateService from devices module with OpenSSL implementation.'
    );
  }
}
