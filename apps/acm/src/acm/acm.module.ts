import { Module } from '@nestjs/common';
import { AcmController } from './acm.controller.js';
import { GroupsController } from './groups.controller.js';
import { AcmService } from './acm.service.js';
import { GroupsService } from './groups.service.js';

@Module({
  controllers: [AcmController, GroupsController],
  providers: [AcmService, GroupsService],
  exports: [AcmService, GroupsService],
})
export class AcmModule {}
