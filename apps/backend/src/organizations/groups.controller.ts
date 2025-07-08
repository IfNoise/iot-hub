import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { GroupsService } from './groups.service.js';
import { organizationsContract } from '@iot-hub/users';

@ApiTags('groups')
@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @TsRestHandler(organizationsContract.createGroup)
  async createGroup() {
    return tsRestHandler(organizationsContract.createGroup, async ({ params, body }) => {
      const groupData = { ...body, organizationId: params.organizationId };
      const group = await this.groupsService.create(groupData);
      return { status: 201, body: group };
    });
  }

  @TsRestHandler(organizationsContract.getGroups)
  async getGroups() {
    return tsRestHandler(organizationsContract.getGroups, async ({ params, query }) => {
      const queryData = { ...query, organizationId: params.organizationId };
      const result = await this.groupsService.findAll(queryData);
      return { status: 200, body: result };
    });
  }

  @TsRestHandler(organizationsContract.getGroup)
  async getGroup() {
    return tsRestHandler(organizationsContract.getGroup, async ({ params }) => {
      const group = await this.groupsService.findById(params.id);
      return { status: 200, body: group };
    });
  }

  @TsRestHandler(organizationsContract.updateGroup)
  async updateGroup() {
    return tsRestHandler(organizationsContract.updateGroup, async ({ params, body }) => {
      const group = await this.groupsService.update(params.id, body);
      return { status: 200, body: group };
    });
  }

  @TsRestHandler(organizationsContract.deleteGroup)
  async deleteGroup() {
    return tsRestHandler(organizationsContract.deleteGroup, async ({ params }) => {
      await this.groupsService.delete(params.id);
      return { status: 204, body: undefined };
    });
  }

  @TsRestHandler(organizationsContract.getGroupDevices)
  async getGroupDevices() {
    return tsRestHandler(organizationsContract.getGroupDevices, async ({ params, query }) => {
      const result = await this.groupsService.getGroupDevices(params.id, query);
      return { status: 200, body: result };
    });
  }

  @TsRestHandler(organizationsContract.getGroupUsers)
  async getGroupUsers() {
    return tsRestHandler(organizationsContract.getGroupUsers, async ({ params, query }) => {
      const result = await this.groupsService.getGroupUsers(params.id, query);
      return { status: 200, body: result };
    });
  }
}
