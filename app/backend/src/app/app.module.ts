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

@Module({
  imports: [
    DatabaseModule,
    CryptoModule,
    DevicesModule,
    TypeOrmModule.forFeature([Device, Certificate]),
  ],
  controllers: [AppController, DevicesController],
  providers: [AppService, CryptoService, DevicesService],
})
export class AppModule {}
