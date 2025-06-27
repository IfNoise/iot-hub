import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeviceSimulatorService } from './device-simulator.service';
import { DeviceSimulatorController } from './device-simulator.controller';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module';
import { MqttDeviceModule } from '../mqtt/mqtt-device.module';

@Module({
  imports: [CryptoChipModule, MqttDeviceModule, HttpModule],
  controllers: [DeviceSimulatorController],
  providers: [DeviceSimulatorService],
  exports: [DeviceSimulatorService],
})
export class DeviceSimulatorModule {}
