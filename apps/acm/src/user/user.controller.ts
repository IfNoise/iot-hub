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
  UseGuards,
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
import { RolesGuard, PermissionsGuard, Permissions } from '@iot-hub/rbac';
import { UserService } from './user.service.js';
import { createZodPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('users')
@UseGuards(RolesGuard, PermissionsGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly metricsService: MetricsService,
    private readonly telemetryService: TelemetryService,
    private readonly loggingService: LoggingService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('users:write')
  async create(
    @Body(createZodPipe(CreateUserSchema)) createUserData: CreateUser
  ): Promise<{ invitationId: string; inviteUrl: string }> {
    const startTime = Date.now();
    const span = this.telemetryService.createSpan('user.create_invitation', {
      'user.email': createUserData.email,
      operation: 'create_user_invitation',
    });

    try {
      this.loggingService.log('info', 'Creating user invitation', {
        operation: 'create_user_invitation',
        email: createUserData.email,
      });

      const invitation = await this.userService.createInvitation(createUserData);
      const duration = Date.now() - startTime;

      // Записываем метрики успешного создания приглашения
      this.metricsService.recordBusinessOperation({
        serviceName: 'acm',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'create_user_invitation',
        entityType: 'invitation',
        entityId: invitation.invitationId,
        success: true,
        durationMs: duration,
      });

      this.loggingService.log('info', 'User invitation created successfully', {
        operation: 'create_user_invitation',
        invitationId: invitation.invitationId,
        email: createUserData.email,
        duration,
      });

      span.setStatus({ code: 1 }); // SUCCESS
      span.end();
      return invitation;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Записываем метрики ошибки
      this.metricsService.recordBusinessOperation({
        serviceName: 'acm',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'create_user_invitation',
        entityType: 'invitation',
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

  @Post('sync/:userId')
  @HttpCode(HttpStatus.OK)
  @Permissions('users:sync') // Internal permission for Kafka consumers
  async syncFromKeycloak(@Param('userId') userId: string): Promise<User> {
    const startTime = Date.now();
    const span = this.telemetryService.createSpan('user.sync_from_keycloak', {
      'user.id': userId,
      operation: 'sync_user_from_keycloak',
    });

    try {
      this.loggingService.log('info', 'Syncing user from Keycloak', {
        operation: 'sync_user_from_keycloak',
        userId,
      });

      const user = await this.userService.syncFromKeycloak(userId);
      const duration = Date.now() - startTime;

      this.metricsService.recordBusinessOperation({
        serviceName: 'acm',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'sync_user_from_keycloak',
        entityType: 'user',
        entityId: user.id,
        success: true,
        durationMs: duration,
      });

      this.loggingService.log('info', 'User synced from Keycloak successfully', {
        operation: 'sync_user_from_keycloak',
        userId: user.userId,
        email: user.email,
        duration,
      });

      span.setStatus({ code: 1 }); // SUCCESS
      span.end();
      return user;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.metricsService.recordBusinessOperation({
        serviceName: 'acm',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        operation: 'sync_user_from_keycloak',
        entityType: 'user',
        success: false,
        durationMs: duration,
      });

      this.loggingService.log('error', 'Failed to sync user from Keycloak', {
        operation: 'sync_user_from_keycloak',
        userId,
        error: (error as Error).message,
        duration,
      });

      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      span.end();
      throw error;
    }
  }

  @Get()
  @Permissions('users:read')
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
  @Permissions('users:read')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Permissions('users:write')
  async update(
    @Param('id') id: string,
    @Body(createZodPipe(UpdateUserSchema)) updateUserData: UpdateUser
  ): Promise<User> {
    return this.userService.update(id, updateUserData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users:delete')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
