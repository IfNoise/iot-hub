import { Module } from '@nestjs/common';
import { AcmController } from './acm.controller.js';
import { GroupsController } from './groups.controller.js';
import { AcmService } from './acm.service.js';
import { GroupsService } from './groups.service.js';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationsController } from './organizations.controller.js';

@Module({
  controllers: [AcmController, GroupsController, OrganizationsController],
  providers: [AcmService, GroupsService, OrganizationsService],
  exports: [AcmService, GroupsService, OrganizationsService],
})
export class AcmModule {}
