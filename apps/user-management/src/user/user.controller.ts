import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  type User,
  type CreateUser,
  type UpdateUser,
  CreateUserSchema,
  UpdateUserSchema,
} from '@iot-hub/users';
import { UserService } from './user.service';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(createZodPipe(CreateUserSchema)) createUserData: CreateUser
  ): Promise<User> {
    return this.userService.create(createUserData);
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('plan') plan?: string
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    return this.userService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      organizationId,
      plan,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(createZodPipe(UpdateUserSchema)) updateUserData: UpdateUser
  ): Promise<User> {
    return this.userService.update(id, updateUserData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
