import { Controller } from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';
import { DevicesService } from './devices.service';
import { devicesContract } from '@iot-hub/devices';
import { DeviceMapper } from './mappers/device.mapper';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface';

@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @TsRestHandler(devicesContract.registerDevice)
  async registerDevice() {
    return tsRestHandler(devicesContract.registerDevice, async ({ body }) => {
      try {
        const device = await this.devicesService.createDevice(body);
        const deviceDto = DeviceMapper.toDto(device);

        return {
          status: 201 as const,
          body: {
            message: 'Устройство успешно зарегистрировано',
            device: deviceDto,
          },
        };
      } catch (error) {
        return {
          status: 400 as const,
          body: {
            message:
              error instanceof Error
                ? error.message
                : 'Неверные данные запроса',
          },
        };
      }
    });
  }

  @TsRestHandler(devicesContract.bindDevice)
  async bindDevice() {
    return tsRestHandler(devicesContract.bindDevice, async ({ body }) => {
      try {
        const result = await this.devicesService.bindDevice(body);
        const deviceDto = DeviceMapper.toDto(result.device);

        return {
          status: 200 as const,
          body: {
            message: 'Устройство успешно привязано',
            device: deviceDto,
          },
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            return {
              status: 404 as const,
              body: { message: 'Устройство не найдено' },
            };
          }
          if (error.message.includes('already bound')) {
            return {
              status: 409 as const,
              body: { message: 'Устройство уже привязано' },
            };
          }
        }
        return {
          status: 400 as const,
          body: {
            message:
              error instanceof Error
                ? error.message
                : 'Ошибка привязки устройства',
          },
        };
      }
    });
  }

  @TsRestHandler(devicesContract.unbindDevice)
  async unbindDevice() {
    return tsRestHandler(devicesContract.unbindDevice, async ({ body }) => {
      try {
        const result = await this.devicesService.unbindDevice(body.id);
        const deviceDto = DeviceMapper.toDto(result.device);

        return {
          status: 200 as const,
          body: {
            message: 'Устройство успешно отвязано',
            device: deviceDto,
          },
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: { message: 'Устройство не найдено' },
          };
        }
        return {
          status: 400 as const,
          body: {
            message:
              error instanceof Error
                ? error.message
                : 'Ошибка отвязки устройства',
          },
        };
      }
    });
  }

  @TsRestHandler(devicesContract.getDevices)
  async getDevices(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(devicesContract.getDevices, async ({ query }) => {
      try {
        // Если пользователь администратор - возвращаем все устройства
        if (user.role === 'admin') {
          const result = await this.devicesService.getDevices(query);
          const devicesDto = DeviceMapper.toDtoArray(result.devices);

          return {
            status: 200 as const,
            body: {
              devices: devicesDto,
              total: result.meta.total,
              page: result.meta.page,
              limit: result.meta.limit,
              totalPages: result.meta.totalPages,
            },
          };
        }

        // Если обычный пользователь - возвращаем только его устройства
        const result = await this.devicesService.getUserDevices(user.id, query);
        const devicesDto = DeviceMapper.toDtoArray(result.devices);

        return {
          status: 200 as const,
          body: {
            devices: devicesDto,
            total: result.meta.total,
            page: result.meta.page,
            limit: result.meta.limit,
            totalPages: result.meta.totalPages,
          },
        };
      } catch (error) {
        return {
          status: 401 as const,
          body: {
            message:
              error instanceof Error
                ? error.message
                : 'Ошибка получения устройств',
          },
        };
      }
    });
  }

  @TsRestHandler(devicesContract.getAllDevicesAdmin)
  async getAllDevicesAdmin() {
    return tsRestHandler(
      devicesContract.getAllDevicesAdmin,
      async ({ query }) => {
        try {
          // TODO: Временно без проверки прав администратора - нужно добавить middleware
          const result = await this.devicesService.getDevices(query);
          const devicesDto = DeviceMapper.toDtoArray(result.devices);

          return {
            status: 200 as const,
            body: {
              devices: devicesDto,
              total: result.meta.total,
              page: result.meta.page,
              limit: result.meta.limit,
              totalPages: result.meta.totalPages,
            },
          };
        } catch (error) {
          return {
            status: 500 as const,
            body: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Внутренняя ошибка сервера',
            },
          };
        }
      }
    );
  }
}
