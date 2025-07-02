const { Crypto } = require('@peculiar/webcrypto');
const crypto = new Crypto();
const { X509CertificateGenerator } = require('@peculiar/x509');

// Устанавливаем cryptoProvider для X509CertificateGenerator
X509CertificateGenerator.crypto = crypto;
const fs = require('fs');
const path = require('path');

// Функция для преобразования ArrayBuffer в PEM
function bufferToPem(buffer, type) {
  const base64 = Buffer.from(buffer).toString('base64');
  const wrapped = base64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----\n`;
}

async function generateCA() {
  try {
    console.log('1. Генерация ключевой пары RSA...');

    // Генерируем ключевую пару для CA
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // extractable должен быть true для экспорта
      ['sign', 'verify']
    );

    console.log('2. Проверка созданной ключевой пары...');
    if (!keyPair || !keyPair.privateKey || !keyPair.publicKey) {
      throw new Error('Не удалось создать ключевую пару: неполные данные');
    }

    console.log('3. Создание CA сертификата...');
    // Создаем CA сертификат
    const caCert = await X509CertificateGenerator.createSelfSigned({
      serialNumber: '01',
      name: 'CN=IoT Hub Root CA, O=IoT Hub, OU=Certificate Authority, C=RU, ST=Moscow, L=Moscow',
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 лет
      signingAlgorithm: {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      keys: keyPair,
    });

    console.log('4. Преобразование сертификата в PEM формат...');
    const caCertPem = caCert.toString('pem');

    console.log('5. Экспорт приватного ключа в PKCS#8...');
    // Экспортируем приватный ключ в PKCS#8 формат
    const privateKeyBuffer = await crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey
    );

    console.log('6. Преобразование ключа в PEM формат...');
    const privateKeyPem = bufferToPem(privateKeyBuffer, 'PRIVATE KEY');

    console.log('7. Сохранение сертификата и ключа в файл...');
    // Создаем директорию, если она не существует
    const certsDir = path.join(__dirname, 'test-certs');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    const caKeyPath = path.join(certsDir, 'test-ca-key-pkcs8.pem');
    const caCertPath = path.join(certsDir, 'test-ca-cert.pem');

    // Записываем файлы
    console.log(`- Запись приватного ключа в ${caKeyPath}`);
    fs.writeFileSync(caKeyPath, privateKeyPem);

    console.log(`- Запись сертификата в ${caCertPath}`);
    fs.writeFileSync(caCertPath, caCertPem);

    console.log('8. CA сертификат успешно создан');

    // Выводим сертификат для проверки
    console.log('\nСоздан сертификат:');
    console.log(caCertPem);
  } catch (error) {
    console.error('Ошибка генерации CA сертификата:', error);
    console.error(`Детали ошибки: ${error.message}`);
    console.error(`Стек вызовов: ${error.stack}`);
  }
}

console.log('Запуск генерации тестового CA сертификата...');
generateCA()
  .then(() => {
    console.log('Завершено');
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
  });
