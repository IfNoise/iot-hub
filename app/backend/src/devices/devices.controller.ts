import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { BindDeviceDto } from './dto/bind-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('sign-device')
  async registerDevice(@Body() dto: CreateDeviceDto) {
    return this.devicesService.createDevice(dto);
  }
  @Post('bind-device')
  async bindDevice(@Body() dto: BindDeviceDto) {
    return this.devicesService.bindDevice(dto);
  }
  @Post('unbind-device')
  async unbindDevice(@Body() dto: BindDeviceDto) {
    return this.devicesService.unbindDevice(dto.deviceId);
  }
  /**
   * Получение списка всех устройств с пагинацией
   * @param {number} [page=1] - Номер страницы (по умолчанию 1)
   * @param {number} [limit=10] - Количество устройств на странице (по умолчанию 10)
   * @returns
   */
  @Get()
  async getDevices(@Query() query: { page?: number; limit?: number }) {
    return this.devicesService.getDevices(query);
  }
}
