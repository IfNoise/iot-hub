const { Crypto } = require('@peculiar/webcrypto');
const {
  X509Certificate,
  X509CertificateGenerator,
  Pkcs10CertificateRequest,
} = require('@peculiar/x509');
const crypto = new Crypto();
const fs = require('fs');
const path = require('path');

// Устанавливаем cryptoProvider для X509CertificateGenerator
X509CertificateGenerator.crypto = crypto;

async function testCSRSigning() {
  try {
    console.log('Тестирование подписания CSR...');

    // 1. Загружаем CA сертификат и ключ
    const caKeyPath = path.join(__dirname, 'certs', 'ca-key-pkcs8.pem');
    const caCertPath = path.join(__dirname, 'certs', 'ca-cert.pem');

    console.log(`Чтение CA сертификата из: ${caCertPath}`);
    const caCertPem = fs.readFileSync(caCertPath, 'utf8');

    console.log(`Чтение CA ключа из: ${caKeyPath}`);
    const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');

    // Используем готовый CSR для тестирования
    console.log('Использование тестового CSR...');
    const deviceId = `test-device-${Date.now()}`;

    // Образец CSR
    const csrPem = `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwVzELMAkGA1UEBhMCUlUxDzANBgNVBAgMBk1vc2NvdzEPMA0G
A1UEBwwGTW9zY293MRAwDgYDVQQKDAdJb1QgSHViMRQwEgYDVQQDDAtleGFtcGxl
LmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKO0eSUD9T0Uy/jG
pyDMWV/Ga3nWjwQRJkpkZ+xN8NdQQlUS0UXKZmQdZS4nZU/XSA48xm/JmYgbDrph
X0EgE0HVIrXUwIlrfpK55qlBBJ62QyA+QjQI5XSmfBSwK2NLpvmrDMQBSJL+MFGs
LGCf8BQcA0nO8BijPrd/j+HYRznFlaM6gJ2u9JKxBXoUZI7Lb6kefvHKa5GhP9K4
zj6nJjkLEpT3MfpALLSP9PGhbQ3TblFedGUJDuz1BHuP0wRQW4GHk2oIpvXWddvJ
NTMsxkz2eDf5ODzTbVXIJPC6JYT1N/2HpUgBGyX1PBvvT+uNyEhMlWh5mDMIOa/I
lMudP50CAwEAAaA+MDwGCSqGSIb3DQEJDjEvMC0wHAYDVR0RBBUwE4IRZHV0LXNl
cmlhbC1hbmFsb2cwDQYDVR0OBAYEBAECAwQwDQYJKoZIhvcNAQELBQADggEBAIhj
ZWztUXUFYCBBz/z5rL7oy+LfLnwS1vAO7wKT8m+9GhtkrDV8voKlLdzQcBpBN8UA
FGRyVhSBNMKp9JJn+4iO0J5C+mxZazPt8sGRuXWAOy8j0EOAsDfVqKGl6MbLUKQd
yvAydFB1CGXKxkrQYPBDxTLJMH8c73lCj1QrDFZnjUO5JBR0QI2Ld7PiIPwqNKNj
ZJvuEgyEqNTZLZm3WBOjIURJAPx6vHpRBJmjOYgpbYdADNLvkHKj4ljTbCFYTPw2
8y+LPJ9YKqNBbJ3jY+2HONdNhZR12DxlF2Zyac8xl9kzSB6NzzQCB0BxM7hX3n+f
7KPouw/gxr8OC99D4zs=
-----END CERTIFICATE REQUEST-----`;

    console.log('CSR готов к использованию');

    console.log('CSR создан успешно:');
    console.log(csrPem.substring(0, 100) + '...');

    // 3. Импортируем CA ключ
    console.log('Импорт CA ключа...');
    const caKeyBuffer = pemToBuffer(caKeyPem);

    console.log(`Размер буфера CA ключа: ${caKeyBuffer.byteLength} байт`);
    console.log(
      `Первые байты буфера CA ключа: ${Array.from(caKeyBuffer.slice(0, 10))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')}`
    );

    const caKey = await crypto.subtle.importKey(
      'pkcs8',
      caKeyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    console.log('CA ключ импортирован успешно');

    // 4. Импортируем CA сертификат
    console.log('Импорт CA сертификата...');
    const caCert = new X509Certificate(caCertPem);
    console.log('CA сертификат импортирован успешно');

    // 5. Импортируем публичный ключ из CSR
    console.log('Импорт публичного ключа из CSR...');
    const csrObject = new Pkcs10CertificateRequest(csrPem);
    const publicKeyInfo = csrObject.publicKey;

    console.log(
      `Размер публичного ключа из CSR: ${publicKeyInfo.rawData.byteLength} байт`
    );

    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyInfo.rawData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    console.log('Публичный ключ импортирован успешно');

    // 6. Подписываем CSR с помощью CA
    console.log('Подписание CSR...');
    const clientCert = await X509CertificateGenerator.create({
      serialNumber: generateSerialNumber(),
      subject: `CN=${deviceId}, O=IoT Hub Test, OU=Devices, C=RU`,
      issuer: caCert.subject,
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 год
      signingKey: caKey,
      publicKey: publicKey,
      signingAlgorithm: 'RSASSA-PKCS1-v1_5',
    });

    console.log('CSR успешно подписан!');

    // 7. Преобразуем сертификат в PEM
    const clientCertPem = clientCert.toString('pem');
    console.log('Сертификат устройства:');
    console.log(clientCertPem);

    // Сохраняем результаты в файл для проверки
    const outputPath = path.join(__dirname, 'test-device-cert.pem');
    fs.writeFileSync(outputPath, clientCertPem);
    console.log(`Сертификат устройства сохранен в ${outputPath}`);
  } catch (error) {
    console.error('Ошибка подписания CSR:', error);
    console.error(`Детали ошибки: ${error.message}`);
    console.error(`Стек вызовов: ${error.stack}`);
  }
}

// Вспомогательные функции
function pemToBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  return Buffer.from(base64, 'base64');
}

function generateSerialNumber() {
  return Math.floor(Math.random() * 1000000).toString(16);
}

testCSRSigning()
  .then(() => {
    console.log('Тестирование завершено');
  })
  .catch((error) => {
    console.error('Непредвиденная ошибка:', error);
  });
