import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { UsersService } from './users.service.js';
import { User, usersContract } from '@iot-hub/users';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(usersContract.createUser)
  async createUser() {
    return tsRestHandler(usersContract.createUser, async ({ body }) => {
      const user = (await this.usersService.create(body)) as User;

      return { status: 201, body: user };
    });
  }

  @TsRestHandler(usersContract.getUsers)
  async getUsers() {
    return tsRestHandler(usersContract.getUsers, async () => {
      const users = (await this.usersService.findAll()) as User[];
      return { status: 200, body: users };
    });
  }

  @TsRestHandler(usersContract.getUser)
  async getUser() {
    return tsRestHandler(usersContract.getUser, async ({ params }) => {
      const user = (await this.usersService.findOne(params.id)) as User;
      return { status: 200, body: user };
    });
  }

  @TsRestHandler(usersContract.updateUser)
  async updateUser() {
    return tsRestHandler(usersContract.updateUser, async ({ params, body }) => {
      const user = (await this.usersService.update(params.id, body)) as User;
      return { status: 200, body: user };
    });
  }

  @TsRestHandler(usersContract.deleteUser)
  async deleteUser() {
    return tsRestHandler(usersContract.deleteUser, async ({ params }) => {
      await this.usersService.remove(params.id);
      return { status: 204, body: undefined };
    });
  }

  @TsRestHandler(usersContract.updateBalance)
  async updateBalance() {
    return tsRestHandler(
      usersContract.updateBalance,
      async ({ params, body }) => {
        const user = (await this.usersService.updateBalance(
          params.id,
          body.amount
        )) as User;
        return { status: 200, body: user };
      }
    );
  }

  @TsRestHandler(usersContract.updatePlan)
  async updatePlan() {
    return tsRestHandler(usersContract.updatePlan, async ({ params, body }) => {
      const user = (await this.usersService.updatePlan(
        params.id,
        body.plan,
        body.expiresAt
      )) as User;
      return { status: 200, body: user };
    });
  }
}
