import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    DatabaseModule,
    CryptoModule,
    DevicesModule,
    UsersModule,
    TypeOrmModule.forFeature([Device, Certificate, User]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
        autoLogging: true,
        redact: ['req.headers.authorization'],
      },
    }),
  ],
  controllers: [AppController, DevicesController],
  providers: [AppService, CryptoService, DevicesService, UsersService],
})
export class AppModule {}
