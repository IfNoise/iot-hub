import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать нового пользователя' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Пользователь успешно создан',
    type: UserResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех пользователей',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Данные пользователя',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Пользователь не найден',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<UserResponseDto> {
    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Пользователь успешно обновлен',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Пользователь не найден',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Пользователь успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Пользователь не найден',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.usersService.remove(id);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Обновить баланс пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Баланс успешно обновлен',
    type: UserResponseDto,
  })
  async updateBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: number
  ): Promise<UserResponseDto> {
    return await this.usersService.updateBalance(id, amount);
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Обновить план пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'План успешно обновлен',
    type: UserResponseDto,
  })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { plan: 'free' | 'pro'; expiresAt?: Date }
  ): Promise<UserResponseDto> {
    return await this.usersService.updatePlan(id, body.plan, body.expiresAt);
  }
}
