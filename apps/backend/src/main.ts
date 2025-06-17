/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import 'dotenv/config';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable logging
  app.useLogger(app.get(Logger));

  // Patch NestJS Swagger for Zod integration
  patchNestJsSwagger();

  // Set up global prefix for API routes
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS with security considerations
  app.enableCors({
    origin: '*', // Allow all origins - should be restricted in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Enable Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IoT Hub API')
    .setDescription('API documentation for the IoT Hub platform')
    .setVersion('0.0.1')
    .addBearerAuth() // Add JWT Bearer token support
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  // Start the application
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  console.log(
    `📚 API Documentation: http://localhost:${port}/${globalPrefix}/docs`
  );
}

bootstrap();
