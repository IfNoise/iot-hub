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
import {
  MetricsService,
  TelemetryService,
  LoggingService,
} from '@iot-hub/observability';
import { UserService } from './user.service';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly metricsService: MetricsService,
    private readonly telemetryService: TelemetryService,
    private readonly loggingService: LoggingService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(createZodPipe(CreateUserSchema)) createUserData: CreateUser
  ): Promise<User> {
    const startTime = Date.now();
    const span = this.telemetryService.createSpan('user.create', {
      'user.email': createUserData.email,
      operation: 'create_user',
    });

    try {
      this.loggingService.log('info', 'Creating new user', {
        operation: 'create_user',
        email: createUserData.email,
      });

      const user = await this.userService.create(createUserData);
      const duration = Date.now() - startTime;

      // Записываем метрики успешного создания
      this.metricsService.recordBusinessOperation({
        serviceName: 'user-management',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'create_user',
        entityType: 'user',
        entityId: user.id,
        success: true,
        durationMs: duration,
      });

      this.loggingService.log('info', 'User created successfully', {
        operation: 'create_user',
        userId: user.id,
        email: user.email,
        duration,
      });

      span.setStatus({ code: 1 }); // SUCCESS
      span.end();
      return user;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Записываем метрики ошибки
      this.metricsService.recordBusinessOperation({
        serviceName: 'user-management',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'create_user',
        entityType: 'user',
        success: false,
        durationMs: duration,
      });

      this.loggingService.log('error', 'Failed to create user', {
        operation: 'create_user',
        email: createUserData.email,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      span.end();
      throw error;
    }
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
