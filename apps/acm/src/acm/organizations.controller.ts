import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { organizationsContract } from '@iot-hub/users';
import { OrganizationsService } from './organizations.service.js';

@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // Примечание: создание организаций происходит только через Keycloak события
  // Здесь только методы чтения

  @TsRestHandler(organizationsContract.getOrganizations)
  async getOrganizations() {
    return tsRestHandler(
      organizationsContract.getOrganizations,
      async ({ query }) => {
        try {
          // Преобразуем параметры в правильные типы
          const queryParams = {
            page: query.page ? Number(query.page) : undefined,
            limit: query.limit ? Number(query.limit) : undefined,
            search: query.search,
          };

          const result = await this.organizationsService.findAll(queryParams);

          return {
            status: 200,
            body: result,
          };
        } catch (error) {
          console.error('Error fetching organizations:', error);
          return {
            status: 500,
            body: {
              error: 'InternalServerError',
              message: 'Failed to fetch organizations',
            },
          };
        }
      }
    );
  }

  @TsRestHandler(organizationsContract.getOrganization)
  async getOrganization() {
    return tsRestHandler(
      organizationsContract.getOrganization,
      async ({ params }) => {
        try {
          const organization = await this.organizationsService.findOne(
            params.id
          );

          if (!organization) {
            return {
              status: 404,
              body: {
                error: 'NotFound',
                message: 'Organization not found',
              },
            };
          }

          return {
            status: 200,
            body: organization,
          };
        } catch (error) {
          console.error('Error fetching organization:', error);
          return {
            status: 500,
            body: {
              error: 'InternalServerError',
              message: 'Failed to fetch organization',
            },
          };
        }
      }
    );
  }

  // Примечание: обновление и удаление организаций происходит только через Keycloak события
}
