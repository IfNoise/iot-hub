import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoModule } from '../crypto/crypto.module'; // Import CryptoModule for cryptographic operations

@Module({
  imports: [TypeOrmModule.forFeature([Device, Certificate]), CryptoModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
