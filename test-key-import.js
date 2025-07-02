const { Crypto } = require('@peculiar/webcrypto');
const crypto = new Crypto();
const fs = require('fs');
const path = require('path');

async function testKeyImport() {
  try {
    console.log('Тестирование импорта приватного ключа CA...');

    // Путь к ключу CA в формате PKCS#8
    const caKeyPath = path.join(__dirname, 'certs', 'ca-key-pkcs8.pem');

    console.log(`Чтение ключа из файла: ${caKeyPath}`);
    const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');

    console.log('Содержимое ключа (первые 100 символов):');
    console.log(caKeyPem.substring(0, 100) + '...');

    // Конвертация PEM в ArrayBuffer
    const base64 = caKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const caKeyBuffer = Buffer.from(base64, 'base64');

    console.log(`Размер буфера ключа: ${caKeyBuffer.byteLength} байт`);

    // Функция для анализа ASN.1 структуры (упрощенная)
    function analyzeASN1(buffer) {
      try {
        // Выводим первые байты для анализа
        console.log('ASN.1 анализ:');
        console.log(
          `- Первые байты: ${Array.from(buffer.slice(0, 10))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ')}`
        );

        // Проверяем основные маркеры ASN.1 для формата PKCS#8
        const isSequence = buffer[0] === 0x30;
        const hasVersion = buffer[2] === 0x02; // Версия должна быть INTEGER

        console.log(`- Начинается с SEQUENCE: ${isSequence ? 'Да' : 'Нет'}`);
        console.log(`- Содержит VERSION: ${hasVersion ? 'Да' : 'Нет'}`);

        return isSequence && hasVersion;
      } catch (error) {
        console.error('Ошибка анализа ASN.1:', error);
        return false;
      }
    }

    // Проверяем структуру ключа
    const validASN1 = analyzeASN1(caKeyBuffer);
    console.log(`Структура ASN.1 валидна: ${validASN1 ? 'Да' : 'Нет'}`);

    console.log('Импорт ключа через WebCrypto API...');
    try {
      // Попытка импорта ключа
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

      console.log('Импорт успешен!');
      console.log('Тип ключа:', caKey.type);
      console.log('Алгоритм:', caKey.algorithm.name);
    } catch (error) {
      console.error('Ошибка импорта ключа:', error);
      console.error(`Детали ошибки: ${error.message}`);
      console.error(`Стек вызовов: ${error.stack}`);
    }
  } catch (error) {
    console.error('Критическая ошибка:', error);
    console.error(`Детали: ${error.message}`);
    console.error(`Стек вызовов: ${error.stack}`);
  }
}

testKeyImport()
  .then(() => {
    console.log('Тестирование завершено');
  })
  .catch((error) => {
    console.error('Непредвиденная ошибка:', error);
  });
