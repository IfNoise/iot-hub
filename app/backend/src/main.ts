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
//import { JwtMiddleware } from './common/middlewire/jwt.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable logging
  app.useLogger(app.get(Logger));
  //app.use(new JwtMiddleware().use);
  patchNestJsSwagger();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    allowedHeaders: 'Content-Type, Authorization', // Allowed headers
  });
  // Enable Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IoT Hub API')
    .setDescription('API documentation for the IoT Hub')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  // Set up global prefix for API routes
  app.setGlobalPrefix(globalPrefix);
  // Start the application
  console.log(`Global prefix set to: ${globalPrefix}`);
  // Set the port from environment variable or default to 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
