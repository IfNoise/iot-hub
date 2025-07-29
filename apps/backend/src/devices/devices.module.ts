import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller.js';
import { CertificatesController } from './certificates.controller.js';
import { DevicesService } from './devices.service.js';
import { CertificateService } from './certificate-mtls.service.js';
import { Device } from './entities/device.entity.js';
import { Certificate } from './entities/certificate.entity.js';
import { ConfigModule } from '../config/config.module.js';
import { KafkaModule } from '../infrastructure/kafka/kafka.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, Certificate]),
    ConfigModule,
    KafkaModule,
  ],
  controllers: [DevicesController, CertificatesController],
  providers: [DevicesService, CertificateService],
  exports: [DevicesService, CertificateService],
})
export class DevicesModule {}
