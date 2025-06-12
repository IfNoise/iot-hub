#!/usr/bin/env node

// Простой тест для проверки файлового логирования без модулей NestJS
import 'dotenv/config';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Простая функция для создания логгера как в ConfigService
function createLogger() {
  const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/development.log';
  const ENABLE_FILE_LOGGING_IN_DEV =
    process.env.ENABLE_FILE_LOGGING_IN_DEV === 'true';

  console.log('📋 Переменные окружения:');
  console.log('- LOG_LEVEL:', LOG_LEVEL);
  console.log('- LOG_FILE_PATH:', LOG_FILE_PATH);
  console.log('- ENABLE_FILE_LOGGING_IN_DEV:', ENABLE_FILE_LOGGING_IN_DEV);

  if (!ENABLE_FILE_LOGGING_IN_DEV) {
    console.log('❌ Файловое логирование отключено в development');
    return null;
  }

  // Убеждаемся что директория существует
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log('📁 Создана директория для логов:', logDir);
  }

  return pino({
    level: LOG_LEVEL,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          level: LOG_LEVEL,
          options: {
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
        {
          target: 'pino/file',
          level: LOG_LEVEL,
          options: {
            destination: LOG_FILE_PATH,
            mkdir: true,
          },
        },
      ],
    },
  });
}

async function testLogging() {
  console.log('🧪 Тестируем файловое логирование...\n');

  const logger = createLogger();

  if (!logger) {
    console.log('⚠️ Логгер не создан - проверьте переменные окружения');
    return;
  }

  console.log('✅ Логгер создан успешно\n');

  // Тестируем разные уровни логирования
  console.log('📝 Отправляем тестовые сообщения...');

  logger.debug('🐛 Тестовое debug сообщение');
  logger.info('ℹ️ Тестовое info сообщение');
  logger.warn('⚠️ Тестовое warning сообщение');
  logger.error('❌ Тестовое error сообщение');

  // Добавляем структурированные данные
  logger.info(
    {
      userId: 'test-user-123',
      action: 'test_logging',
      metadata: {
        testType: 'file_logging',
        timestamp: new Date().toISOString(),
      },
    },
    'Тестовое структурированное сообщение'
  );

  console.log('✅ Сообщения отправлены в лог\n');

  // Ждём немного чтобы файлы записались
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Проверяем содержимое лог файла
  const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/development.log';
  if (fs.existsSync(LOG_FILE_PATH)) {
    const logContent = fs.readFileSync(LOG_FILE_PATH, 'utf8');
    const lines = logContent.trim().split('\n');

    console.log(
      `📊 Найдено ${lines.length} строк в лог файле: ${LOG_FILE_PATH}`
    );
    console.log('📄 Последние несколько записей:');

    const lastLines = lines.slice(-5);
    lastLines.forEach((line, index) => {
      try {
        const parsed = JSON.parse(line);
        console.log(`  ${index + 1}. [${parsed.level}] ${parsed.msg}`);
      } catch {
        console.log(`  ${index + 1}. ${line.substring(0, 100)}...`);
      }
    });
  } else {
    console.log('❌ Лог файл не найден:', LOG_FILE_PATH);
  }

  console.log('\n🏁 Тест завершён');
}

testLogging().catch(console.error);
