import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificateService } from './certificate-mtls.service';
import { Certificate } from './entities/certificate.entity';
import { Device } from './entities/device.entity';
import { CryptoModule } from '../crypto/crypto.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Device]),
    CryptoModule,
    ConfigModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificatesModule {}
