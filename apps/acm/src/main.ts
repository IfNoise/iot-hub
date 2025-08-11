/**
 * UserManagement Microservice
 * Handles user and organization management with event-driven architecture
 * Connected to separate user_management database
 */

// ВАЖНО: Инструментация должна быть первой!
import './instrumentation.js';

import 'dotenv/config';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { generateOpenApi } from '@ts-rest/open-api';
import { acmServiceContract as contracts } from '@iot-hub/contracts';
import * as swaggerUi from 'swagger-ui-express';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Pino logging
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe with Zod
  app.useGlobalPipes(new ZodValidationPipe());

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
        keycloakAuth: {
          type: 'oauth2',
          flows: {
            password: {
              tokenUrl:
                'http://localhost:8080/realms/iot-hub/protocol/openid-connect/token',
              scopes: {
                openid: 'Basic identity',
                profile: 'User profile',
                email: 'User email',
              },
            },
          },
        },
      },
    },
    security: [{ keycloakAuth: ['openid'] }],
  });

  // Setup Swagger UI with correct path
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        displayRequestDuration: true,
        tryItOutEnabled: true,
        // Enable the "Authorize" button
        authAction: {
          bearerAuth: {
            name: 'bearerAuth',
            schema: {
              type: 'http',
              in: 'header',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            value: 'Bearer ',
          },
        },
      },
    })
  );

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
