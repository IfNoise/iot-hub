import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeviceSimulatorService } from './device-simulator.service.js';
import { DeviceSimulatorController } from './device-simulator.controller.js';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module.js';
import { MqttDeviceModule } from '../mqtt/mqtt-device.module.js';

@Module({
  imports: [CryptoChipModule, MqttDeviceModule, HttpModule],
  controllers: [DeviceSimulatorController],
  providers: [DeviceSimulatorService],
  exports: [DeviceSimulatorService],
})
export class DeviceSimulatorModule {}
