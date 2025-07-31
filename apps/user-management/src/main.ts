/**
 * UserManagement Microservice
 * Handles user and organization management with event-driven architecture
 * Connected to separate user_management database
 */

// ВАЖНО: Инструментация должна быть первой!
import './instrumentation';

import 'dotenv/config';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Pino logging
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe with Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('User Management Service')
    .setDescription('Microservice for user and organization management')
    .setVersion('1.0')
    .addTag('users')
    .addTag('organizations')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(
    `🚀 UserManagement Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  logger.log(
    `📚 Swagger docs available at: http://localhost:${port}/${globalPrefix}/docs`
  );
}

bootstrap().catch((error) => {
  console.error('❌ Ошибка запуска UserManagement Service:', error);
  process.exit(1);
});
