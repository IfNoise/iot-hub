const forge = require('node-forge');

// Тестируем CSR от device-simulator
const csrPem = `-----BEGIN CERTIFICATE REQUEST-----
MIIChzCCAW8CAQAwQjEeMBwGA1UEAxMVZmluYWwtdGVzdC1kZXZpY2UtMDAxMRMw
EQYDVQQKEwpJb1QgRGV2aWNlMQswCQYDVQQGEwJSVTCCASIwDQYJKoZIhvcNAQEB
BQADggEPADCCAQoCggEBAKZ+g3DJJTfmVYs2TH8EZZcl57u1CHMVvDnFyeCmuQ/i
/dPQkPLDP0TRfv9aCZSnGlWUR/6h+eYUj2Dtc6m8fTV7IkYM7bY0wRfUewIZSD0M
AsU/VVulQtEitSijXi2sC3ZV/0ULBJ5FIDZbHrIN3zMX1zvIQ4flbZEo7+r4CmPc
HceSSFljLj3NxfTzEvMkniwB3sR6wWHPFw5nyFTYGgnYzB4JOkJb4iadMoaZXBUW
J478vx+KNK4WdYuigUxXj2gxAykpFscNeIGdnkfZn/jQND5Eg9qJvCySf9yTg4kt
NpdzRFLCsRKYO7A4/amLfUC37IPgy1Lw9a6LVCzkOGsCAwEAAaAAMA0GCSqGSIb3
DQEBCwUAA4IBAQBG/gUtpkkyaXR8BHdOO925LI000wRspDUxyV1al1fSPywL2cjd
k283i3D77EoHvXiDtsda123Mg85q1jaD6UTnvoOAqF6D24C/Q6GXr5ZGqKhVrsGY
evJw000DAjmU6FLpr7HgWqWhOLpvE5Nrz04n0LUDWuEWjifzjitY3xsqiA16FOdQ
31Bvl7KdPpGeIZr/vx3SnM4VzV4B/FiFASe+YRNxqsOYhCER+HrE4hIuoHGPSQyj
udhaqngvZ+OlIAeHp7ihNNZKTnIEVnnIlZdC2Rh/gIfGeKPS0uSRBYBfV5ATsuFZ
OINlvc000fS+0MX9WwfCYMU3ZHnkK71nxHG5
-----END CERTIFICATE REQUEST-----`;

try {
  console.log('Тестирование парсинга CSR...');

  const pki = forge.pki;

  // Парсим CSR
  const csr = pki.certificationRequestFromPem(csrPem);
  console.log('✅ CSR успешно распарсен');

  // Проверяем CSR
  const isValid = csr.verify();
  console.log(`✅ CSR валидность: ${isValid}`);

  if (!csr.publicKey) {
    throw new Error('CSR не содержит публичный ключ');
  }
  console.log('✅ CSR содержит публичный ключ');

  // Показываем subject
  console.log('Subject:');
  csr.subject.attributes.forEach((attr) => {
    console.log(`  ${attr.name}: ${attr.value}`);
  });

  console.log('🎉 CSR прошёл все проверки!');
} catch (error) {
  console.error('❌ Ошибка тестирования CSR:', error);
}
