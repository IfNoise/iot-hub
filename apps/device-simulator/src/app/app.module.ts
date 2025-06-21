import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeviceSimulatorModule } from '../device-simulator/device-simulator.module';

@Module({
  imports: [DeviceSimulatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
