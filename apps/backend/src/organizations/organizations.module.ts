import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationsController } from './organizations.controller.js';
import { GroupsService } from './groups.service.js';
import { GroupsController } from './groups.controller.js';
import { Organization } from '../users/entities/organization.entity.js';
import { Group } from '../users/entities/group.entity.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Group, User])],
  controllers: [OrganizationsController, GroupsController],
  providers: [OrganizationsService, GroupsService],
  exports: [OrganizationsService, GroupsService],
})
export class OrganizationsModule {}
