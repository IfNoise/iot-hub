import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service.js';
import * as forge from 'node-forge';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signCertificate', () => {
    let deviceId: string;
    let csrPem: string;

    beforeEach(() => {
      // Generate a test CSR first
      const pki = forge.pki;
      const keys = pki.rsa.generateKeyPair(1024);
      const csr = pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      csr.setSubject([{ name: 'commonName', value: 'test-device' }]);
      csr.sign(keys.privateKey);

      deviceId = 'test-device';
      csrPem = pki.certificationRequestToPem(csr);
    });

    it('should sign a valid CSR and return certificates', () => {
      const result = service.signCertificate({ deviceId, csrPem });

      expect(result).toBeDefined();
      expect(result.clientCert).toBeDefined();
      expect(result.clientCert).toContain('BEGIN CERTIFICATE');
      expect(result.clientCert).toContain('END CERTIFICATE');

      expect(result.caCert).toBeDefined();
      expect(result.caCert).toContain('BEGIN CERTIFICATE');
      expect(result.caCert).toContain('END CERTIFICATE');

      expect(result.fingerprint).toBeDefined();
      expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);

      expect(result.publicKeyPem).toBeDefined();
      expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(result.publicKeyPem).toContain('END PUBLIC KEY');
    });

    it('should throw error when CSR is invalid', () => {
      const invalidCsrPem = 'invalid CSR content';

      expect(() => {
        service.signCertificate({ deviceId, csrPem: invalidCsrPem });
      }).toThrow();
    });

    it('should set certificate subject to deviceId', () => {
      const result = service.signCertificate({ deviceId, csrPem });

      const cert = forge.pki.certificateFromPem(result.clientCert);
      const subject = cert.subject.getField('CN');

      expect(subject.value).toEqual(deviceId);
    });
  });
});
