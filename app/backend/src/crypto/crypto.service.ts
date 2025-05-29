// src/crypto/crypto.service.ts
import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';

interface SignCertificateResult {
  clientCert: string;
  caCert: string;
  fingerprint: string;
  publicKeyPem: string;
}

@Injectable()
export class CryptoService {
  signCertificate({
    deviceId,
    csrPem,
  }: {
    deviceId: string;
    csrPem: string;
  }): SignCertificateResult {
    const pki = forge.pki;

    const csr = pki.certificationRequestFromPem(csrPem);
    if (!csr.verify()) {
      throw new Error('CSR verification failed');
    }

    if (!csr.publicKey) {
      throw new Error('CSR does not contain a valid public key');
    }

    const cert = pki.createCertificate();
    cert.publicKey = csr.publicKey;
    cert.serialNumber = Math.floor(Math.random() * 1000000).toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 1
    );

    cert.setSubject([
      {
        name: 'commonName',
        value: deviceId,
      },
    ]);

    const caKeyPair = pki.rsa.generateKeyPair(2048);
    const caCert = pki.createCertificate();
    caCert.publicKey = caKeyPair.publicKey;
    caCert.serialNumber = '01';
    caCert.validity.notBefore = new Date();
    caCert.validity.notAfter = new Date();
    caCert.validity.notAfter.setFullYear(
      caCert.validity.notBefore.getFullYear() + 10
    );

    caCert.setSubject([
      {
        name: 'commonName',
        value: 'IoT CA',
      },
    ]);
    caCert.setIssuer(caCert.subject.attributes);

    caCert.sign(caKeyPair.privateKey);
    cert.setIssuer(caCert.subject.attributes);
    cert.sign(caKeyPair.privateKey);

    const clientCertPem = pki.certificateToPem(cert);
    const caCertPem = pki.certificateToPem(caCert);
    const publicKeyPem = pki.publicKeyToPem(csr.publicKey);

    const fingerprint = forge.md.sha256
      .create()
      .update(forge.asn1.toDer(pki.certificateToAsn1(cert)).getBytes())
      .digest()
      .toHex();

    return {
      clientCert: clientCertPem,
      caCert: caCertPem,
      fingerprint,
      publicKeyPem,
    };
  }
}
