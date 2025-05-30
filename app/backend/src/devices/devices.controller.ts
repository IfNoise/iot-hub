import { Controller, Post, Body, Get } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { type BindDeviceDto, type CreateDeviceDto } from 'iot-core';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('sign-device')
  async registerDevice(@Body() dto: CreateDeviceDto) {
    return this.devicesService.createDevice(dto);
  }
  @Post('bind-device')
  async bindDevice(@Body() dto: BindDeviceDto) {
    return this.devicesService.bindDevice(dto.deviceId, dto.ownerId);
  }
  @Post('unbind-device')
  async unbindDevice(@Body() dto: BindDeviceDto) {
    return this.devicesService.unbindDevice(dto.deviceId);
  }
  @Get()
  async getDevices() {
    return this.devicesService.getDevices();
  }
}
