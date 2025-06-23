import { Controller, UseGuards } from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';
import { DevicesService } from './devices.service';
import { devicesContract } from '@iot-hub/devices';
import { DeviceMapper } from './mappers/device.mapper';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface';
import { RolesGuard } from '../common/guard/roles-guard.guard';
import { Roles } from '../common/decorator/roles.decorator';

@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @TsRestHandler(devicesContract.manufacturing.generateDeviceQR)
  async generateDeviceQR() {
    return tsRestHandler(
      devicesContract.manufacturing.generateDeviceQR,
      async ({ body }) => {
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
      }
    );
  }

  @TsRestHandler(devicesContract.user.bindDeviceQR)
  async bindDeviceQR(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(
      devicesContract.user.bindDeviceQR,
      async ({ body }) => {
        try {
          // userId получаем из middleware аутентификации, а не из body
          const result = await this.devicesService.bindDevice({
            id: body.qrData.deviceId,
            ownerId: user.id, // userId из JWT токена
          });

          return {
            status: 200 as const,
            body: {
              message: 'Устройство успешно привязано',
              device: {
                deviceId: result.device.id,
                userId: user.id,
                boundAt: result.device.lastSeenAt,
                status: 'bound' as const,
              },
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
                body: {
                  message: 'Устройство уже привязано',
                  code: 'ALREADY_BOUND' as const,
                },
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
      }
    );
  }

  @TsRestHandler(devicesContract.user.unbindDevice)
  async unbindDevice(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(
      devicesContract.user.unbindDevice,
      async ({ body }) => {
        try {
          // Проверяем, что пользователь имеет право отвязать устройство
          await this.devicesService.unbindDevice(body.deviceId, user.id);

          return {
            status: 200 as const,
            body: {
              message: 'Устройство успешно отвязано',
              deviceId: body.deviceId,
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
      }
    );
  }

  @TsRestHandler(devicesContract.user.getMyDevices)
  async getMyDevices(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(
      devicesContract.user.getMyDevices,
      async ({ query }) => {
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
          const result = await this.devicesService.getUserDevices(
            user.id,
            query
          );
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
      }
    );
  }

  @TsRestHandler(devicesContract.admin.getAllDevices)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllDevices() {
    return tsRestHandler(
      devicesContract.admin.getAllDevices,
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
