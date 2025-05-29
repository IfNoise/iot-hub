import { Controller, Post, Body, Get } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { type CreateDeviceDto } from 'iot-core';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async registerDevice(@Body() dto: CreateDeviceDto) {
    return this.devicesService.createDevice(dto);
  }
  @Get()
  async getDevices() {
    return this.devicesService.getDevices();
  }
}
