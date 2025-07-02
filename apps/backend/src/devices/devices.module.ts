import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller.js';
import { CertificatesController } from './certificates.controller.js';
import { DevicesService } from './devices.service.js';
import { CertificateService } from './certificate-mtls.service.js';
import { Device } from './entities/device.entity.js';
import { Certificate } from './entities/certificate.entity.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, Certificate]),
    CryptoModule,
    ConfigModule,
  ],
  controllers: [DevicesController, CertificatesController],
  providers: [DevicesService, CertificateService],
  exports: [DevicesService, CertificateService],
})
export class DevicesModule {}
