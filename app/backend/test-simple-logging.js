// Простой тест логирования pino
const pino = require('pino');

const logger = pino({
  level: 'debug',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
      {
        target: 'pino-roll',
        level: 'debug',
        options: {
          file: './logs/test.log',
          frequency: 'daily',
          size: '10M',
          limit: {
            count: 3,
          },
        },
      },
    ],
  },
});

console.log('🧪 Тестируем pino с файловым логированием...');

logger.debug('🐛 Debug сообщение');
logger.info('ℹ️ Info сообщение');
logger.warn('⚠️ Warning сообщение');
logger.error('❌ Error сообщение');

console.log('✅ Тест завершён. Проверьте файл ./logs/test.log');

// Ждём немного чтобы файлы записались
setTimeout(() => {
  process.exit(0);
}, 1000);
