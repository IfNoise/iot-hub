#!/usr/bin/env node

/**
 * Пример скрипта для тестирования MQTT RPC API
 *
 * Использование:
 * node test-mqtt-rpc.js
 *
 * Или с параметрами:
 * node test-mqtt-rpc.js --host localhost --port 3000 --user user123 --device device456
 */

const axios = require('axios');

// Конфигурация по умолчанию
const defaultConfig = {
  host: 'localhost',
  port: 3000,
  userId: 'test-user',
  deviceId: 'test-device',
  timeout: 5000,
};

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...defaultConfig };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      config[key] = isNaN(value) ? value : Number(value);
    }
  }

  return config;
}

// HTTP клиент для API
class MqttRpcClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async sendCommand(userId, deviceId, method, params = {}, timeout = 5000) {
    try {
      const response = await this.client.post('/api/mqtt/device/command', {
        userId,
        deviceId,
        method,
        params,
        timeout,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `HTTP ${error.response.status}: ${JSON.stringify(
            error.response.data
          )}`
        );
      }
      throw error;
    }
  }

  async sendCommandNoResponse(userId, deviceId, method, params = {}) {
    try {
      const response = await this.client.post(
        '/api/mqtt/device/command/no-response',
        {
          userId,
          deviceId,
          method,
          params,
        }
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `HTTP ${error.response.status}: ${JSON.stringify(
            error.response.data
          )}`
        );
      }
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await this.client.post('/api/mqtt/status');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `HTTP ${error.response.status}: ${JSON.stringify(
            error.response.data
          )}`
        );
      }
      throw error;
    }
  }
}

// Тестовые функции
async function testMqttStatus(client) {
  console.log('\n🔍 Проверка статуса MQTT...');
  try {
    const status = await client.getStatus();
    console.log('✅ Статус MQTT:', JSON.stringify(status, null, 2));
    return status.connected;
  } catch (error) {
    console.error('❌ Ошибка при проверке статуса:', error.message);
    return false;
  }
}

async function testGetDeviceState(client, userId, deviceId, timeout) {
  console.log('\n📱 Тестирование getDeviceState...');
  try {
    const result = await client.sendCommand(
      userId,
      deviceId,
      'getDeviceState',
      {},
      timeout
    );
    console.log('✅ Состояние устройства:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Ошибка getDeviceState:', error.message);
    return false;
  }
}

async function testGetSensors(client, userId, deviceId, timeout) {
  console.log('\n🌡️  Тестирование getSensors...');
  try {
    const result = await client.sendCommand(
      userId,
      deviceId,
      'getSensors',
      {},
      timeout
    );
    console.log('✅ Данные сенсоров:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Ошибка getSensors:', error.message);
    return false;
  }
}

async function testRebootNoResponse(client, userId, deviceId) {
  console.log('\n🔄 Тестирование reboot (без ответа)...');
  try {
    const result = await client.sendCommandNoResponse(
      userId,
      deviceId,
      'reboot',
      {}
    );
    console.log(
      '✅ Команда reboot отправлена:',
      JSON.stringify(result, null, 2)
    );
    return true;
  } catch (error) {
    console.error('❌ Ошибка reboot:', error.message);
    return false;
  }
}

async function testUpdateDiscreteTimer(client, userId, deviceId, timeout) {
  console.log('\n⏰ Тестирование updateDiscreteTimer...');
  const params = {
    id: 1,
    enabled: true,
    schedule: '0 8 * * *', // Каждый день в 8:00
    duration: 300, // 5 минут
    channel: 1,
  };

  try {
    const result = await client.sendCommand(
      userId,
      deviceId,
      'updateDiscreteTimer',
      params,
      timeout
    );
    console.log(
      '✅ Дискретный таймер обновлен:',
      JSON.stringify(result, null, 2)
    );
    return true;
  } catch (error) {
    console.error('❌ Ошибка updateDiscreteTimer:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  const config = parseArgs();
  const baseURL = `http://${config.host}:${config.port}`;

  console.log('🚀 Тестирование MQTT RPC API');
  console.log('📋 Конфигурация:', JSON.stringify(config, null, 2));
  console.log('🌐 API URL:', baseURL);

  const client = new MqttRpcClient(baseURL);

  let passedTests = 0;
  let totalTests = 0;

  // Тест 1: Проверка статуса MQTT
  totalTests++;
  if (await testMqttStatus(client)) {
    passedTests++;
  }

  // Тест 2: Получение состояния устройства
  totalTests++;
  if (
    await testGetDeviceState(
      client,
      config.userId,
      config.deviceId,
      config.timeout
    )
  ) {
    passedTests++;
  }

  // Тест 3: Получение данных сенсоров
  totalTests++;
  if (
    await testGetSensors(client, config.userId, config.deviceId, config.timeout)
  ) {
    passedTests++;
  }

  // Тест 4: Перезагрузка устройства (без ответа)
  totalTests++;
  if (await testRebootNoResponse(client, config.userId, config.deviceId)) {
    passedTests++;
  }

  // Тест 5: Обновление дискретного таймера
  totalTests++;
  if (
    await testUpdateDiscreteTimer(
      client,
      config.userId,
      config.deviceId,
      config.timeout
    )
  ) {
    passedTests++;
  }

  // Результаты
  console.log('\n📊 Результаты тестирования:');
  console.log(`✅ Пройдено: ${passedTests}/${totalTests}`);
  console.log(`❌ Провалено: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 Все тесты пройдены успешно!');
    process.exit(0);
  } else {
    console.log('⚠️  Некоторые тесты завершились с ошибками');
    process.exit(1);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('💥 Необработанная ошибка:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Тестирование прервано пользователем');
  process.exit(0);
});

// Запуск
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}
