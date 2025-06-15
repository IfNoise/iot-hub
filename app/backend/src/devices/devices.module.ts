import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { CertificatesController } from './certificates.controller';
import { DevicesService } from './devices.service';
import { CertificateService } from './certificate-mtls.service';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoModule } from '../crypto/crypto.module';
import { ConfigModule } from '../config/config.module';

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
