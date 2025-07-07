/**
 * DeviceSimulator - симулятор IoT устройства
 * Включает имитацию криптографического чипа, MQTT RPC клиент и полный флоу регистрации
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const options = new DocumentBuilder()
    .setTitle('Device Simulator API')
    .setDescription('API для симуляции IoT устройств')
    .setVersion('1.0')
    .addTag('device-simulator')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  const port = 3001; // Используем 3001 чтобы не конфликтовать с backend
  await app.listen(port);
  Logger.log(
    `🚀 DeviceSimulator запущен на: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📖 Документация API доступна по адресу: http://localhost:${port}/${globalPrefix}/simulator`
  );
  Logger.log(`🔗 MQTT RPC поддержка включена для обработки команд от backend`);
  Logger.log(`🔐 Криптографический чип симулятор готов к работе`);
}

bootstrap();
