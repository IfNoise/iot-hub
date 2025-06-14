// simulate-device.js
const forge = require('node-forge');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

(async () => {
  // Генерация RSA-ключа
  const keypair = forge.pki.rsa.generateKeyPair(2048);

  // Генерация id устройства и данных
  const deviceId = uuidv4();

  // Генерация CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keypair.publicKey;
  csr.setSubject([
    {
      name: 'commonName',
      value: deviceId,
    },
  ]);
  csr.sign(keypair.privateKey);
  const csrPem = forge.pki.certificationRequestToPem(csr);

  const dto = {
    id: deviceId,
    model: 'Model-X',
    csrPem: csrPem,
    firmwareVersion: '1.0.0',
  };

  // Отправка запроса на сервер
  try {
    const response = await axios.post(
      'http://localhost:3000/api/devices/sign-device',
      dto,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('✅ Device registered');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error registering device');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
})();
