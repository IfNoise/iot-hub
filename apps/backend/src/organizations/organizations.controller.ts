import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { OrganizationsService } from './organizations.service.js';
import { organizationsContract } from '@iot-hub/users';

@ApiTags('organizations')
@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @TsRestHandler(organizationsContract.createOrganization)
  async createOrganization() {
    return tsRestHandler(organizationsContract.createOrganization, async ({ body }) => {
      const organization = await this.organizationsService.create(body);
      return { status: 201, body: organization };
    });
  }

  @TsRestHandler(organizationsContract.getOrganizations)
  async getOrganizations() {
    return tsRestHandler(organizationsContract.getOrganizations, async ({ query }) => {
      const result = await this.organizationsService.findAll(query);
      return { status: 200, body: result };
    });
  }

  @TsRestHandler(organizationsContract.getOrganization)
  async getOrganization() {
    return tsRestHandler(organizationsContract.getOrganization, async ({ params }) => {
      const organization = await this.organizationsService.findById(params.id);
      return { status: 200, body: organization };
    });
  }

  @TsRestHandler(organizationsContract.updateOrganization)
  async updateOrganization() {
    return tsRestHandler(organizationsContract.updateOrganization, async ({ params, body }) => {
      const organization = await this.organizationsService.update(params.id, body);
      return { status: 200, body: organization };
    });
  }

  @TsRestHandler(organizationsContract.deleteOrganization)
  async deleteOrganization() {
    return tsRestHandler(organizationsContract.deleteOrganization, async ({ params }) => {
      await this.organizationsService.delete(params.id);
      return { status: 204, body: undefined };
    });
  }
}
