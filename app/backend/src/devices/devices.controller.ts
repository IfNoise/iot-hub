import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { BindDeviceDto } from './dto/bind-device.dto';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guard/roles-guard.guard';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('sign-device')
  @ApiOperation({ summary: 'Регистрация нового устройства' })
  @ApiResponse({
    status: 201,
    description: 'Устройство успешно зарегистрировано',
  })
  @ApiResponse({ status: 400, description: 'Неверные данные запроса' })
  async registerDevice(@Body() dto: CreateDeviceDto) {
    return this.devicesService.createDevice(dto);
  }

  @Post('bind-device')
  @ApiOperation({ summary: 'Привязка устройства к пользователю' })
  @ApiResponse({ status: 200, description: 'Устройство успешно привязано' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  @ApiResponse({ status: 409, description: 'Устройство уже привязано' })
  async bindDevice(@Body() dto: BindDeviceDto) {
    return this.devicesService.bindDevice(dto);
  }

  @Post('unbind-device')
  @ApiOperation({ summary: 'Отвязка устройства от пользователя' })
  @ApiResponse({ status: 200, description: 'Устройство успешно отвязано' })
  @ApiResponse({ status: 404, description: 'Устройство не найдено' })
  async unbindDevice(@Body() dto: { id: string }) {
    return this.devicesService.unbindDevice(dto.id);
  }
  /**
   * Получение списка устройств с разграничением доступа:
   * - Администраторы получают все устройства
   * - Обычные пользователи получают только свои устройства
   * @param {number} [page=1] - Номер страницы (по умолчанию 1)
   * @param {number} [limit=10] - Количество устройств на странице (по умолчанию 10)
   * @param user - Текущий аутентифицированный пользователь
   * @returns Список устройств в зависимости от роли пользователя
   */
  @Get()
  @ApiOperation({
    summary: 'Получение списка устройств',
    description:
      'Администраторы получают все устройства, обычные пользователи - только свои',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Номер страницы (по умолчанию 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Количество устройств на странице (по умолчанию 10)',
  })
  @ApiResponse({ status: 200, description: 'Список устройств получен успешно' })
  @ApiResponse({ status: 401, description: 'Пользователь не аутентифицирован' })
  async getDevices(
    @Query() query: { page?: number; limit?: number },
    @CurrentUser() user: AuthenticatedUser
  ) {
    // Если пользователь администратор - возвращаем все устройства
    if (user.role === 'admin') {
      return this.devicesService.getDevices(query);
    }

    // Если обычный пользователь - возвращаем только его устройства
    return this.devicesService.getUserDevices(user.id, query);
  }

  /**
   * Администраторский эндпоинт для получения всех устройств
   * Доступен только пользователям с ролью admin
   * @param {number} [page=1] - Номер страницы
   * @param {number} [limit=10] - Количество устройств на странице
   * @returns Список всех устройств в системе
   */
  @Get('admin/all')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Получение всех устройств (только для администраторов)',
    description:
      'Возвращает полный список всех устройств в системе. Доступен только администраторам.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Номер страницы (по умолчанию 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Количество устройств на странице (по умолчанию 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список всех устройств получен успешно',
  })
  @ApiResponse({ status: 401, description: 'Пользователь не аутентифицирован' })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав (требуется роль admin)',
  })
  async getAllDevicesAdmin(@Query() query: { page?: number; limit?: number }) {
    return this.devicesService.getDevices(query);
  }
}
