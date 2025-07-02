import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DeviceSimulatorModule } from '../device-simulator/device-simulator.module.js';

@Module({
  imports: [DeviceSimulatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
