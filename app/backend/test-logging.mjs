#!/usr/bin/env node

// Простой тест для проверки файлового логирования
import 'dotenv/config';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from './src/config/config.service';

async function testLogging() {
  console.log('🧪 Тестируем файловое логирование...');

  const configService = new ConfigService();
  const loggingConfig = configService.getLoggingConfig();

  console.log(
    '📋 Конфигурация логирования:',
    JSON.stringify(loggingConfig, null, 2)
  );

  // Создаём временное приложение для тестирования
  const { Module } = await import('@nestjs/common');
  const { LoggerModule } = await import('nestjs-pino');

  @Module({
    imports: [
      LoggerModule.forRoot({
        pinoHttp: {
          ...loggingConfig,
          autoLogging: false,
        },
      }),
    ],
  })
  class TestModule {}

  const app = await NestFactory.createApplicationContext(TestModule);
  const logger = app.get(Logger);

  // Тестируем разные уровни логирования
  logger.debug('🐛 Тестовое debug сообщение');
  logger.log('ℹ️ Тестовое info сообщение');
  logger.warn('⚠️ Тестовое warning сообщение');
  logger.error('❌ Тестовое error сообщение');

  console.log('✅ Сообщения отправлены в лог');

  // Ждём немного чтобы файлы записались
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await app.close();
  console.log('🏁 Тест завершён');
}

testLogging().catch(console.error);
