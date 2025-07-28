import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../devices/entities/device.entity.js';

@Injectable()
export class DeviceAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const { user } = req;
    const deviceId = req.params.deviceId;

    if (!deviceId || !user) {
      throw new ForbiddenException('Недостаточно данных');
    }

    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      select: ['id', 'ownerId', 'organizationId', 'groupId'],
    });

    if (!device) throw new NotFoundException('Устройство не найдено');

    // 1. Персональный владелец
    if (device.ownerId === user.databaseId) return true;

    // 2. Org-level доступ
    if (
      device.organizationId &&
      user.organizationId === device.organizationId &&
      ['org_admin', 'admin'].includes(user.role)
    ) {
      return true;
    }

    // 3. Group-level доступ
    if (
      device.groupId &&
      user.groupId === device.groupId &&
      ['group_admin'].includes(user.role)
    ) {
      return true;
    }

    throw new ForbiddenException('Нет доступа к устройству');
  }
}
