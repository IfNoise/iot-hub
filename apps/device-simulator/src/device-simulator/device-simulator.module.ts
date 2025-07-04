import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeviceSimulatorService } from './device-simulator.service.js';
import { DeviceSimulatorController } from './device-simulator.controller.js';
import { QRGeneratorService } from './qr-generator.service.js';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module.js';
import { MqttDeviceModule } from '../mqtt/mqtt-device.module.js';

@Module({
  imports: [CryptoChipModule, MqttDeviceModule, HttpModule],
  controllers: [DeviceSimulatorController],
  providers: [DeviceSimulatorService, QRGeneratorService],
  exports: [DeviceSimulatorService, QRGeneratorService],
})
export class DeviceSimulatorModule {}
