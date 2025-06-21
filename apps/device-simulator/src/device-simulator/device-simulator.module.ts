import { Module } from '@nestjs/common';
import { DeviceSimulatorService } from './device-simulator.service';
import { DeviceSimulatorController } from './device-simulator.controller';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module';

@Module({
  imports: [CryptoChipModule],
  controllers: [DeviceSimulatorController],
  providers: [DeviceSimulatorService],
  exports: [DeviceSimulatorService],
})
export class DeviceSimulatorModule {}
