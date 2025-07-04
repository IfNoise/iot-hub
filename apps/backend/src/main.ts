/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

// ВАЖНО: OpenTelemetry должен быть инициализирован самым первым
import './common/instrumentation.js';

import 'dotenv/config';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { generateOpenApi } from '@ts-rest/open-api';
import { contracts } from '@iot-hub/contracts';
import * as swaggerUi from 'swagger-ui-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable logging
  app.useLogger(app.get(Logger));

  // Set up global prefix for API routes
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Generate OpenAPI documentation from TS-REST contracts
  const document = generateOpenApi(contracts, {
    info: {
      title: 'IoT Hub API',
      version: '1.0.0',
      description: 'API для IoT Hub системы',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/${globalPrefix}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  });

  // Setup Swagger UI with correct path
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(document));

  // Enable CORS with security considerations
  app.enableCors({
    origin: '*', // Allow all origins - should be restricted in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

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

bootstrap().catch((error) => {
  console.error('❌ Ошибка запуска приложения:', error);
  process.exit(1);
});
