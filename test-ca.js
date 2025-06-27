const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// Тестируем CA сертификаты backend
const caKeyPath = path.join(__dirname, 'apps/backend/certs/ca-key.pem');
const caCertPath = path.join(__dirname, 'apps/backend/certs/ca-cert.pem');

try {
  console.log('Тестирование CA сертификатов backend...');

  // Проверяем существование файлов
  if (!fs.existsSync(caKeyPath)) {
    throw new Error(`CA ключ не найден: ${caKeyPath}`);
  }
  console.log('✅ CA ключ найден');

  if (!fs.existsSync(caCertPath)) {
    throw new Error(`CA сертификат не найден: ${caCertPath}`);
  }
  console.log('✅ CA сертификат найден');

  // Загружаем CA
  const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
  const caCertPem = fs.readFileSync(caCertPath, 'utf8');

  const pki = forge.pki;

  // Парсим CA ключ и сертификат
  const caKey = pki.privateKeyFromPem(caKeyPem);
  console.log('✅ CA приватный ключ успешно загружен');

  const caCert = pki.certificateFromPem(caCertPem);
  console.log('✅ CA сертификат успешно загружен');

  // Проверяем сертификат
  const caCertValid = caCert.verify(caCert);
  console.log(`✅ CA сертификат самоподписанный: ${caCertValid}`);

  console.log('CA Subject:');
  caCert.subject.attributes.forEach((attr) => {
    console.log(`  ${attr.name}: ${attr.value}`);
  });

  console.log('🎉 CA сертификаты прошли все проверки!');
} catch (error) {
  console.error('❌ Ошибка тестирования CA:', error.message);
}
