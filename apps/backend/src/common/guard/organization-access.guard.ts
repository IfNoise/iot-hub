// src/common/guards/organization-access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Organization } from '../../users/entities/organization.entity.js';
import { User } from '@iot-hub/users';

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    // Получить organizationId из metadata или использовать по умолчанию
    const orgParam =
      this.reflector.get<string>('organizationParam', context.getHandler()) ??
      'organizationId';

    const organizationId =
      request.params?.[orgParam] ??
      request.body?.[orgParam] ??
      request.query?.[orgParam];

    if (!organizationId) {
      throw new ForbiddenException('Не передан organizationId');
    }

    const organization = await this.orgRepo.findOne({
      where: { id: organizationId },
      select: ['id', 'isActive'],
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundException('Организация не найдена или неактивна');
    }

    const hasAccess = user.roles.includes('admin');

    if (!hasAccess) {
      throw new ForbiddenException('Нет доступа к организации');
    }

    return true;
  }
}
