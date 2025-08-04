import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import {
  groupsContract,
  CreateGroupSchema,
  UpdateGroupSchema,
  AddGroupMemberSchema,
  UpdateGroupMemberRoleSchema,
} from '@iot-hub/acm-contracts';
import { Permissions, RolesGuard } from '@iot-hub/rbac';
import { GroupsService } from './groups.service.js';

@Controller()
@UseGuards(RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * Создание новой группы
   */
  @TsRestHandler(groupsContract.create)
  @Permissions('groups:write')
  async create() {
    return tsRestHandler(groupsContract.create, async ({ body }) => {
      const createRequest = CreateGroupSchema.parse(body);

      // TODO: Получить информацию о текущем пользователе из контекста
      const createdBy = 'current-user-id';

      const newGroup = await this.groupsService.create(
        createRequest,
        createdBy
      );

      return {
        status: 201,
        body: newGroup,
      };
    });
  }

  /**
   * Получение списка групп
   */
  @TsRestHandler(groupsContract.findAll)
  @Permissions('groups:read')
  async findAll() {
    return tsRestHandler(groupsContract.findAll, async ({ query }) => {
      const result = await this.groupsService.findAll(query);

      return {
        status: 200,
        body: result,
      };
    });
  }

  /**
   * Получение группы по ID
   */
  @TsRestHandler(groupsContract.findOne)
  @Permissions('groups:read')
  async findOne() {
    return tsRestHandler(groupsContract.findOne, async ({ params }) => {
      const { id } = params;
      const group = await this.groupsService.findOne(id);

      if (!group) {
        return {
          status: 404,
          body: { message: 'Group not found' },
        };
      }

      return {
        status: 200,
        body: group,
      };
    });
  }

  /**
   * Обновление группы
   */
  @TsRestHandler(groupsContract.update)
  @Permissions('groups:write')
  async update() {
    return tsRestHandler(groupsContract.update, async ({ params, body }) => {
      const { id } = params;
      const updateRequest = UpdateGroupSchema.parse(body);

      const updatedGroup = await this.groupsService.update(id, updateRequest);

      if (!updatedGroup) {
        return {
          status: 404,
          body: { message: 'Group not found' },
        };
      }

      return {
        status: 200,
        body: updatedGroup,
      };
    });
  }

  /**
   * Удаление группы
   */
  @TsRestHandler(groupsContract.remove)
  @Permissions('groups:delete')
  async remove() {
    return tsRestHandler(groupsContract.remove, async ({ params }) => {
      const { id } = params;

      const deleted = await this.groupsService.remove(id);

      if (!deleted) {
        return {
          status: 404,
          body: { message: 'Group not found' },
        };
      }

      return {
        status: 204,
        body: undefined,
      };
    });
  }

  /**
   * Получение участников группы
   */
  @TsRestHandler(groupsContract.getMembers)
  @Permissions('groups:read')
  async getMembers() {
    return tsRestHandler(
      groupsContract.getMembers,
      async ({ params, query }) => {
        const { id } = params;
        const result = await this.groupsService.getMembers(id, query);

        return {
          status: 200,
          body: result,
        };
      }
    );
  }

  /**
   * Добавление участника в группу
   */
  @TsRestHandler(groupsContract.addMember)
  @Permissions('groups:write')
  async addMember() {
    return tsRestHandler(groupsContract.addMember, async ({ params, body }) => {
      const { id: groupId } = params;
      const memberRequest = AddGroupMemberSchema.parse(body);

      // TODO: Получить информацию о текущем пользователе из контекста
      const invitedBy = 'current-user-id';

      const newMember = await this.groupsService.addMember(
        groupId,
        memberRequest.userId,
        memberRequest.role,
        invitedBy
      );

      return {
        status: 201,
        body: newMember,
      };
    });
  }

  /**
   * Обновление роли участника группы
   */
  @TsRestHandler(groupsContract.updateMemberRole)
  @Permissions('groups:write')
  async updateMemberRole() {
    return tsRestHandler(
      groupsContract.updateMemberRole,
      async ({ params, body }) => {
        const { groupId, userId } = params;
        const { role } = UpdateGroupMemberRoleSchema.parse(body);

        const updatedMember = await this.groupsService.updateMemberRole(
          groupId,
          userId,
          role
        );

        if (!updatedMember) {
          return {
            status: 404,
            body: { message: 'Member not found in group' },
          };
        }

        return {
          status: 200,
          body: updatedMember,
        };
      }
    );
  }

  /**
   * Удаление участника из группы
   */
  @TsRestHandler(groupsContract.removeMember)
  @Permissions('groups:write')
  async removeMember() {
    return tsRestHandler(groupsContract.removeMember, async ({ params }) => {
      const { groupId, userId } = params;

      const removed = await this.groupsService.removeMember(groupId, userId);

      if (!removed) {
        return {
          status: 404,
          body: { message: 'Member not found in group' },
        };
      }

      return {
        status: 204,
        body: undefined,
      };
    });
  }
}
