import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevicesService } from '../devices/devices.service';
import { DevicesController } from '../devices/devices.controller';
import { CryptoService } from '../crypto/crypto.service';
import { DatabaseModule } from '../database/database.module';
import { CryptoModule } from '../crypto/crypto.module';
import { DevicesModule } from '../devices/devices.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../devices/entities/device.entity';
import { Certificate } from '../devices/entities/certificate.entity';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from '../auth/auth.module';
import { MiddlewareModule } from '../common/middleware/middleware.module';
import { KeycloakOAuth2Middleware } from '../common/middleware/keycloak-oauth2.middleware';
import { AutoUserSyncMiddleware } from '../common/middleware/auto-user-sync.middleware';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { CommonServicesModule } from '../common/services/common-services.module';

@Module({
  imports: [
    DatabaseModule,
    CryptoModule,
    DevicesModule,
    UsersModule,
    AuthModule,
    MiddlewareModule,
    ConfigModule,
    CommonServicesModule,
    TypeOrmModule.forFeature([Device, Certificate, User]),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          ...configService.getLoggingConfig(),
          autoLogging: true,
          redact: ['req.headers.authorization'],
        },
      }),
    }),
  ],
  controllers: [AppController, DevicesController],
  providers: [AppService, CryptoService, DevicesService, UsersService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Включаем middleware Keycloak с исключениями для публичных маршрутов
    consumer
      .apply(KeycloakOAuth2Middleware)
      .exclude('/api', '/api/health', '/api/health/*', '/api/status')
      .forRoutes('*');

    // Включаем middleware автоматической синхронизации пользователей
    // Применяется после Keycloak middleware для всех защищенных маршрутов
    consumer
      .apply(AutoUserSyncMiddleware)
      .exclude('/api', '/api/health', '/api/health/*', '/api/status')
      .forRoutes('*');
  }
}
